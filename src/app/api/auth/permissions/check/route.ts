import { NextRequest, NextResponse } from 'next/server'
import { getSession, hasPermission, logUserAction, getClientIP } from '@/lib/auth-helpers'
import { z } from 'zod'

const checkPermissionSchema = z.object({
  permission: z.string().min(1, 'Permission is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { permission } = checkPermissionSchema.parse(body)

    const hasAccess = await hasPermission(session, permission)

    // Log permission check for audit purposes
    await logUserAction(
      session,
      'PERMISSION_CHECK',
      'auth',
      `Checked permission: ${permission}`,
      { permission, result: hasAccess },
      getClientIP(request)
    )

    return NextResponse.json({
      hasPermission: hasAccess,
      permission,
      userId: session.user.id,
      branchId: session.user.selectedBranchId,
      roleId: session.user.selectedRoleId,
    })
  } catch (error) {
    console.error('Permission check error:', error)
    
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