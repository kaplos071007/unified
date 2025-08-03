import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requirePermission, logUserAction, getClientIP } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { PROCUREMENT_PERMISSIONS } from '@/constants/permissions'

const createPurchaseOrderSchema = z.object({
  purchaseRequestId: z.string().uuid('Invalid purchase request ID'),
  vendorId: z.string().uuid('Invalid vendor ID'),
  expectedDeliveryDate: z.string().datetime('Invalid delivery date'),
  terms: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    purchaseRequestItemId: z.string().uuid('Invalid PR item ID'),
    quantity: z.number().positive('Quantity must be positive'),
    unitPrice: z.number().positive('Unit price must be positive'),
    specifications: z.string().optional(),
  })).min(1, 'At least one item is required'),
})

const getPurchaseOrdersSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED', 'all']).optional().default('all'),
  vendorId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
})

// GET /api/procurement/purchase-orders - List purchase orders
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    await requirePermission(session, PROCUREMENT_PERMISSIONS.VIEW_PURCHASE_ORDERS)

    const { searchParams } = new URL(request.url)
    const query = getPurchaseOrdersSchema.parse(Object.fromEntries(searchParams))

    const page = parseInt(query.page)
    const limit = parseInt(query.limit)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Branch filtering
    if (session.user.currentRole?.name !== 'super_admin') {
      where.branchId = session.user.selectedBranchId
    } else if (query.branchId) {
      where.branchId = query.branchId
    }

    if (query.search) {
      where.OR = [
        { poNumber: { contains: query.search, mode: 'insensitive' } },
        { vendor: { name: { contains: query.search, mode: 'insensitive' } } },
        { purchaseRequest: { title: { contains: query.search, mode: 'insensitive' } } },
      ]
    }

    if (query.status !== 'all') {
      where.status = query.status
    }

    if (query.vendorId) {
      where.vendorId = query.vendorId
    }

    const [purchaseOrders, totalCount] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: { id: true, name: true, code: true, email: true, phone: true }
          },
          purchaseRequest: {
            select: { 
              id: true, 
              prNumber: true, 
              title: true,
              requestedBy: {
                select: { id: true, fullName: true, email: true }
              }
            }
          },
          branch: {
            select: { id: true, name: true, code: true }
          },
          items: {
            include: {
              purchaseRequestItem: {
                include: {
                  item: {
                    select: { id: true, name: true, code: true, unit: true }
                  }
                }
              }
            }
          },
          _count: {
            select: { items: true }
          }
        }
      }),
      prisma.purchaseOrder.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    await logUserAction(
      session,
      'LIST_PURCHASE_ORDERS',
      'procurement',
      `Listed purchase orders (page ${page}, ${purchaseOrders.length} results)`,
      { query, resultCount: purchaseOrders.length },
      getClientIP(request)
    )

    return NextResponse.json({
      purchaseOrders,
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
    console.error('List purchase orders error:', error)
    
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

// POST /api/procurement/purchase-orders - Create purchase order from approved PR
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    await requirePermission(session, PROCUREMENT_PERMISSIONS.CREATE_PURCHASE_ORDERS)

    const body = await request.json()
    const { purchaseRequestId, vendorId, expectedDeliveryDate, terms, notes, items } = createPurchaseOrderSchema.parse(body)

    // Validate purchase request exists and is approved
    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      include: {
        branch: { select: { code: true } },
        items: { select: { id: true } }
      }
    })

    if (!purchaseRequest) {
      return NextResponse.json(
        { error: 'Purchase request not found' },
        { status: 404 }
      )
    }

    if (purchaseRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Purchase request must be approved before creating purchase order' },
        { status: 400 }
      )
    }

    // Validate vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, name: true }
    })

    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      )
    }

    // Validate all PR items exist
    const prItemIds = items.map(item => item.purchaseRequestItemId)
    const existingPRItems = await prisma.purchaseRequestItem.findMany({
      where: { 
        id: { in: prItemIds },
        purchaseRequestId
      },
      select: { id: true }
    })

    if (existingPRItems.length !== prItemIds.length) {
      return NextResponse.json(
        { error: 'One or more purchase request items not found' },
        { status: 400 }
      )
    }

    // Generate PO number
    const currentYear = new Date().getFullYear()
    const branchCode = purchaseRequest.branch.code
    
    const lastPO = await prisma.purchaseOrder.findFirst({
      where: {
        branchId: purchaseRequest.branchId,
        createdAt: {
          gte: new Date(`${currentYear}-01-01`),
          lt: new Date(`${currentYear + 1}-01-01`)
        }
      },
      orderBy: { createdAt: 'desc' },
      select: { poNumber: true }
    })

    let sequence = 1
    if (lastPO?.poNumber) {
      const match = lastPO.poNumber.match(/PO-(\w+)-(\d{4})-(\d+)/)
      if (match) {
        sequence = parseInt(match[3]) + 1
      }
    }

    const poNumber = `PO-${branchCode}-${currentYear}-${sequence.toString().padStart(4, '0')}`

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    )

    // Create purchase order with items in a transaction
    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          purchaseRequestId,
          vendorId,
          expectedDeliveryDate: new Date(expectedDeliveryDate),
          totalAmount,
          terms,
          notes,
          status: 'DRAFT',
          branchId: purchaseRequest.branchId,
        }
      })

      // Create purchase order items
      await tx.purchaseOrderItem.createMany({
        data: items.map(item => ({
          purchaseOrderId: po.id,
          purchaseRequestItemId: item.purchaseRequestItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          specifications: item.specifications,
        }))
      })

      return po
    })

    // Fetch complete purchase order for response
    const completePO = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrder.id },
      include: {
        vendor: {
          select: { id: true, name: true, code: true, email: true, phone: true }
        },
        purchaseRequest: {
          select: { 
            id: true, 
            prNumber: true, 
            title: true,
            requestedBy: {
              select: { id: true, fullName: true, email: true }
            }
          }
        },
        branch: {
          select: { id: true, name: true, code: true }
        },
        items: {
          include: {
            purchaseRequestItem: {
              include: {
                item: {
                  select: { id: true, name: true, code: true, unit: true }
                }
              }
            }
          }
        }
      }
    })

    await logUserAction(
      session,
      'CREATE_PURCHASE_ORDER',
      'procurement',
      `Created purchase order: ${poNumber}`,
      { 
        poId: purchaseOrder.id,
        poNumber,
        vendorId,
        vendorName: vendor.name,
        prId: purchaseRequestId,
        itemCount: items.length,
        totalAmount
      },
      getClientIP(request)
    )

    return NextResponse.json(
      { 
        message: 'Purchase order created successfully',
        purchaseOrder: completePO
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create purchase order error:', error)
    
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