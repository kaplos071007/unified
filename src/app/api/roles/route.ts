import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requirePermission, logUserAction, getClientIP } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { AUTH_PERMISSIONS } from '@/constants/permissions'

// GET /api/roles - List all roles
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    await requirePermission(session, AUTH_PERMISSIONS.VIEW_USERS)

    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            userBranchRoles: true,
            permissions: true
          }
        }
      }
    })

    await logUserAction(
      session,
      'LIST_ROLES',
      'roles',
      `Listed ${roles.length} roles`,
      { resultCount: roles.length },
      getClientIP(request)
    )

    return NextResponse.json({ roles })
  } catch (error) {
    console.error('List roles error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}