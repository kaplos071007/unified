import { NextRequest, NextResponse } from 'next/server'
import { getSession, hasPermission, logUserAction, getClientIP } from '@/lib/auth-helpers'
import { z } from 'zod'

const checkMultiplePermissionsSchema = z.object({
  permissions: z.array(z.string().min(1)).min(1, 'At least one permission is required'),
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
    const { permissions } = checkMultiplePermissionsSchema.parse(body)

    // Check each permission
    const permissionResults: Record<string, boolean> = {}
    
    for (const permission of permissions) {
      permissionResults[permission] = await hasPermission(session, permission)
    }

    // Log bulk permission check
    await logUserAction(
      session,
      'BULK_PERMISSION_CHECK',
      'auth',
      `Checked ${permissions.length} permissions`,
      { permissions, results: permissionResults },
      getClientIP(request)
    )

    return NextResponse.json({
      permissions: permissionResults,
      userId: session.user.id,
      branchId: session.user.selectedBranchId,
      roleId: session.user.selectedRoleId,
      checkedCount: permissions.length,
    })
  } catch (error) {
    console.error('Multiple permissions check error:', error)
    
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