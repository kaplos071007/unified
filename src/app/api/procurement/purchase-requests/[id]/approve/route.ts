import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, requirePermission, logUserAction, getClientIP } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { PROCUREMENT_PERMISSIONS } from '@/constants/permissions'

const approveRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  comments: z.string().optional(),
})

// POST /api/procurement/purchase-requests/[id]/approve - Approve or reject purchase request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    await requirePermission(session, PROCUREMENT_PERMISSIONS.APPROVE_PURCHASE_REQUESTS)

    const { id } = params
    const body = await request.json()
    const { action, comments } = approveRequestSchema.parse(body)

    // Fetch the purchase request
    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        requestedBy: {
          select: { id: true, fullName: true, email: true }
        },
        branch: {
          select: { id: true, name: true, code: true }
        }
      }
    })

    if (!purchaseRequest) {
      return NextResponse.json(
        { error: 'Purchase request not found' },
        { status: 404 }
      )
    }

    // Check if user can approve this request (different branch access rules)
    const canApprove = 
      session.user.currentRole?.name === 'super_admin' ||
      session.user.currentRole?.name === 'procurement_manager' ||
      (session.user.currentRole?.name === 'branch_manager' && 
       purchaseRequest.branchId === session.user.selectedBranchId)

    if (!canApprove) {
      return NextResponse.json(
        { error: 'You do not have permission to approve this request' },
        { status: 403 }
      )
    }

    // Check current status
    if (purchaseRequest.status !== 'PENDING_APPROVAL' && purchaseRequest.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Cannot ${action.toLowerCase()} request with status: ${purchaseRequest.status}` },
        { status: 400 }
      )
    }

    // Update purchase request status
    const updatedPR = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approvedById: action === 'APPROVE' ? session.user.id : null,
        approvedAt: action === 'APPROVE' ? new Date() : null,
        rejectionReason: action === 'REJECT' ? comments : null,
      },
      include: {
        requestedBy: {
          select: { id: true, fullName: true, email: true }
        },
        approvedBy: {
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
      action === 'APPROVE' ? 'APPROVE_PURCHASE_REQUEST' : 'REJECT_PURCHASE_REQUEST',
      'procurement',
      `${action === 'APPROVE' ? 'Approved' : 'Rejected'} purchase request: ${purchaseRequest.prNumber}`,
      { 
        prId: id,
        prNumber: purchaseRequest.prNumber,
        action,
        comments,
        requestedBy: purchaseRequest.requestedBy.id
      },
      getClientIP(request)
    )

    // TODO: Send notification to requester
    // This would integrate with the notification system when implemented

    return NextResponse.json({
      message: `Purchase request ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
      purchaseRequest: updatedPR
    })
  } catch (error) {
    console.error('Approve purchase request error:', error)
    
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

// PUT /api/procurement/purchase-requests/[id]/approve - Submit for approval
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    await requirePermission(session, PROCUREMENT_PERMISSIONS.CREATE_PURCHASE_REQUESTS)

    const { id } = params

    // Fetch the purchase request
    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
      select: {
        id: true,
        prNumber: true,
        status: true,
        requestedById: true,
        branchId: true
      }
    })

    if (!purchaseRequest) {
      return NextResponse.json(
        { error: 'Purchase request not found' },
        { status: 404 }
      )
    }

    // Check ownership or admin access
    const canSubmit = 
      purchaseRequest.requestedById === session.user.id ||
      session.user.currentRole?.name === 'super_admin' ||
      (session.user.currentRole?.name === 'procurement_manager' && 
       purchaseRequest.branchId === session.user.selectedBranchId)

    if (!canSubmit) {
      return NextResponse.json(
        { error: 'You do not have permission to submit this request' },
        { status: 403 }
      )
    }

    // Check current status
    if (purchaseRequest.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Cannot submit request with status: ${purchaseRequest.status}` },
        { status: 400 }
      )
    }

    // Update status to pending approval
    const updatedPR = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
        submittedAt: new Date(),
      },
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
      'SUBMIT_PURCHASE_REQUEST',
      'procurement',
      `Submitted purchase request for approval: ${purchaseRequest.prNumber}`,
      { 
        prId: id,
        prNumber: purchaseRequest.prNumber
      },
      getClientIP(request)
    )

    return NextResponse.json({
      message: 'Purchase request submitted for approval successfully',
      purchaseRequest: updatedPR
    })
  } catch (error) {
    console.error('Submit purchase request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}