import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requirePermission, logUserAction, getClientIP } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { PROCUREMENT_PERMISSIONS } from '@/constants/permissions'

const createPurchaseRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  requiredDate: z.string().datetime('Invalid required date'),
  items: z.array(z.object({
    itemId: z.string().uuid('Invalid item ID'),
    quantity: z.number().positive('Quantity must be positive'),
    estimatedUnitPrice: z.number().positive('Price must be positive'),
    specifications: z.string().optional(),
  })).min(1, 'At least one item is required'),
})

const getPurchaseRequestsSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'all']).optional().default('all'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'all']).optional().default('all'),
  branchId: z.string().uuid().optional(),
})

// GET /api/procurement/purchase-requests - List purchase requests
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    await requirePermission(session, PROCUREMENT_PERMISSIONS.VIEW_PURCHASE_REQUESTS)

    const { searchParams } = new URL(request.url)
    const query = getPurchaseRequestsSchema.parse(Object.fromEntries(searchParams))

    const page = parseInt(query.page)
    const limit = parseInt(query.limit)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Branch filtering - users can only see PRs from their current branch unless they're super admin
    if (session.user.currentRole?.name !== 'super_admin') {
      where.branchId = session.user.selectedBranchId
    } else if (query.branchId) {
      where.branchId = query.branchId
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { prNumber: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    if (query.status !== 'all') {
      where.status = query.status
    }

    if (query.priority !== 'all') {
      where.priority = query.priority
    }

    const [purchaseRequests, totalCount] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requestedBy: {
            select: { id: true, fullName: true, email: true }
          },
          branch: {
            select: { id: true, name: true, code: true }
          },
          items: {
            include: {
              item: {
                select: { id: true, name: true, code: true, unit: true }
              }
            }
          },
          _count: {
            select: { items: true }
          }
        }
      }),
      prisma.purchaseRequest.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    await logUserAction(
      session,
      'LIST_PURCHASE_REQUESTS',
      'procurement',
      `Listed purchase requests (page ${page}, ${purchaseRequests.length} results)`,
      { query, resultCount: purchaseRequests.length },
      getClientIP(request)
    )

    return NextResponse.json({
      purchaseRequests,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    })
  } catch (error) {
    console.error('List purchase requests error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/procurement/purchase-requests - Create new purchase request
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    await requirePermission(session, PROCUREMENT_PERMISSIONS.CREATE_PURCHASE_REQUESTS)

    const body = await request.json()
    const { title, description, priority, requiredDate, items } = createPurchaseRequestSchema.parse(body)

    // Validate all items exist
    const itemIds = items.map(item => item.itemId)
    const existingItems = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true }
    })

    if (existingItems.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'One or more items not found' },
        { status: 400 }
      )
    }

    // Generate PR number
    const currentYear = new Date().getFullYear()
    const branchCode = session.user.currentBranch?.code || 'XX'
    
    const lastPR = await prisma.purchaseRequest.findFirst({
      where: {
        branchId: session.user.selectedBranchId,
        createdAt: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`)
        }
      },
      orderBy: { createdAt: 'desc' },
      select: { prNumber: true }
    })

    let sequence = 1
    if (lastPR?.prNumber) {
      const match = lastPR.prNumber.match(/PR-(\w+)-(\d{4})-(\d+)/)
      if (match) {
        sequence = parseInt(match[3]) + 1
      }
    }

    const prNumber = `PR-${branchCode}-${currentYear}-${sequence.toString().padStart(4, '0')}`

    // Calculate total estimated amount
    const totalEstimatedAmount = items.reduce((sum, item) => 
      sum + (item.quantity * item.estimatedUnitPrice), 0
    )

    // Create purchase request with items in a transaction
    const purchaseRequest = await prisma.$transaction(async (tx) => {
      const pr = await tx.purchaseRequest.create({
        data: {
          prNumber,
          title,
          description,
          priority,
          requiredDate: new Date(requiredDate),
          totalEstimatedAmount,
          status: 'DRAFT',
          requestedById: session.user.id,
          branchId: session.user.selectedBranchId!,
        }
      })

      // Create purchase request items
      await tx.purchaseRequestItem.createMany({
        data: items.map(item => ({
          purchaseRequestId: pr.id,
          itemId: item.itemId,
          quantity: item.quantity,
          estimatedUnitPrice: item.estimatedUnitPrice,
          specifications: item.specifications,
        }))
      })

      return pr
    })

    // Fetch complete purchase request for response
    const completePR = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequest.id },
      include: {
        requestedBy: {
          select: { id: true, fullName: true, email: true }
        },
        branch: {
          select: { id: true, name: true, code: true }
        },
        items: {
          include: {
            item: {
              select: { id: true, name: true, code: true, unit: true }
            }
          }
        }
      }
    })

    await logUserAction(
      session,
      'CREATE_PURCHASE_REQUEST',
      'procurement',
      `Created purchase request: ${prNumber}`,
      { 
        prId: purchaseRequest.id,
        prNumber,
        itemCount: items.length,
        totalAmount: totalEstimatedAmount
      },
      getClientIP(request)
    )

    return NextResponse.json(
      { 
        message: 'Purchase request created successfully',
        purchaseRequest: completePR
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create purchase request error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}