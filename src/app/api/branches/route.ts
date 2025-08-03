import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requirePermission, logUserAction, getClientIP } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { BRANCH_PERMISSIONS } from '@/constants/permissions'

// GET /api/branches - List all branches
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    await requirePermission(session, BRANCH_PERMISSIONS.VIEW_BRANCHES)

    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            userBranchRoles: true
          }
        }
      }
    })

    await logUserAction(
      session,
      'LIST_BRANCHES',
      'branches',
      `Listed ${branches.length} branches`,
      { resultCount: branches.length },
      getClientIP(request)
    )

    return NextResponse.json({ branches })
  } catch (error) {
    console.error('List branches error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}