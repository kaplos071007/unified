import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions, getUserPermissions } from './auth'
import { prisma } from './db'
import { logger, auditLogger } from './logger'
import type { Session } from 'next-auth'

// Server-side session helpers
export async function getSession(): Promise<Session | null> {
  return await getServerSession(authOptions)
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }
  return session
}

export async function requireContext(): Promise<{
  session: Session
  branchId: string
  roleId: string
}> {
  const session = await requireAuth()
  
  if (!session.user.selectedBranchId || !session.user.selectedRoleId) {
    redirect('/context-selector')
  }

  return {
    session,
    branchId: session.user.selectedBranchId,
    roleId: session.user.selectedRoleId,
  }
}

// Permission checking functions
export async function hasPermission(
  session: Session,
  permission: string
): Promise<boolean> {
  if (!session.user.selectedBranchId || !session.user.selectedRoleId) {
    return false
  }

  const permissions = await getUserPermissions(
    session.user.id,
    session.user.selectedBranchId,
    session.user.selectedRoleId
  )

  return permissions.includes(permission)
}

export async function requirePermission(
  session: Session,
  permission: string,
  redirectPath = '/dashboard'
): Promise<void> {
  const hasAccess = await hasPermission(session, permission)
  
  if (!hasAccess) {
    logger.warn(`Access denied for user ${session.user.id} to permission ${permission}`)
    
    // Log unauthorized access attempt
    await auditLogger.info('Unauthorized access attempt', {
      userId: session.user.id,
      permission,
      branchId: session.user.selectedBranchId,
      roleId: session.user.selectedRoleId,
    })
    
    redirect(redirectPath)
  }
}

// Role hierarchy checking
export async function hasRoleHierarchy(
  session: Session,
  targetUserId: string
): Promise<boolean> {
  if (!session.user.selectedRoleId) return false

  try {
    // Get current user's role hierarchy
    const currentRole = await prisma.role.findUnique({
      where: { id: session.user.selectedRoleId }
    })

    // Get target user's roles in the same branch
    const targetUserRoles = await prisma.userBranchRole.findMany({
      where: {
        userId: targetUserId,
        branchId: session.user.selectedBranchId
      },
      include: { role: true }
    })

    if (!currentRole || targetUserRoles.length === 0) return false

    // Simple role hierarchy check (can be enhanced with actual hierarchy levels)
    const adminRoles = ['super_admin', 'admin', 'branch_manager']
    const managerRoles = [...adminRoles, 'hr_manager', 'finance_manager', 'procurement_manager', 'inventory_manager']

    if (adminRoles.includes(currentRole.name)) return true
    if (managerRoles.includes(currentRole.name)) {
      return !targetUserRoles.some(ubr => adminRoles.includes(ubr.role.name))
    }

    return false
  } catch (error) {
    logger.error('Error checking role hierarchy:', error)
    return false
  }
}

// Branch access validation
export async function validateBranchAccess(
  session: Session,
  branchId: string
): Promise<boolean> {
  if (!session.user.userBranchRoles) return false

  return session.user.userBranchRoles.some(
    ubr => ubr.branchId === branchId
  )
}

export async function requireBranchAccess(
  session: Session,
  branchId: string
): Promise<void> {
  const hasAccess = await validateBranchAccess(session, branchId)
  
  if (!hasAccess) {
    logger.warn(`Branch access denied for user ${session.user.id} to branch ${branchId}`)
    redirect('/dashboard')
  }
}

// Audit logging helpers
export async function logUserAction(
  session: Session,
  action: string,
  module: string,
  description?: string,
  metadata?: any,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action,
        module,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress,
      }
    })

    auditLogger.info(`User action: ${action}`, {
      userId: session.user.id,
      userEmail: session.user.email,
      action,
      module,
      description,
      metadata,
      branchId: session.user.selectedBranchId,
      roleId: session.user.selectedRoleId,
    })
  } catch (error) {
    logger.error('Failed to log user action:', error)
  }
}

// Context switching helpers
export async function switchContext(
  userId: string,
  branchId: string,
  roleId: string
): Promise<boolean> {
  try {
    // Validate the user has access to this branch/role combination
    const userBranchRole = await prisma.userBranchRole.findFirst({
      where: {
        userId,
        branchId,
        roleId,
      },
      include: {
        branch: true,
        role: true,
      }
    })

    if (!userBranchRole) {
      logger.warn(`Invalid context switch attempt for user ${userId}`)
      return false
    }

    // Log context switch
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CONTEXT_SWITCH',
        module: 'auth',
        description: `Switched to ${userBranchRole.branch.name} as ${userBranchRole.role.name}`,
        metadata: JSON.stringify({ branchId, roleId }),
      }
    })

    return true
  } catch (error) {
    logger.error('Context switch error:', error)
    return false
  }
}

// User status helpers
export async function isUserActive(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true }
    })
    return user?.isActive ?? false
  } catch (error) {
    logger.error('Error checking user status:', error)
    return false
  }
}

// Session validation helpers
export async function validateSession(session: Session): Promise<{
  isValid: boolean
  reason?: string
}> {
  try {
    // Check if user is still active
    const isActive = await isUserActive(session.user.id)
    if (!isActive) {
      return { isValid: false, reason: 'User account is inactive' }
    }

    // Check if selected context is still valid
    if (session.user.selectedBranchId && session.user.selectedRoleId) {
      const contextValid = await prisma.userBranchRole.findFirst({
        where: {
          userId: session.user.id,
          branchId: session.user.selectedBranchId,
          roleId: session.user.selectedRoleId,
        }
      })

      if (!contextValid) {
        return { isValid: false, reason: 'Selected context is no longer valid' }
      }
    }

    return { isValid: true }
  } catch (error) {
    logger.error('Session validation error:', error)
    return { isValid: false, reason: 'Session validation failed' }
  }
}

// Permission utilities
export function createPermissionChecker(session: Session) {
  return {
    async can(permission: string): Promise<boolean> {
      return await hasPermission(session, permission)
    },
    
    async canAny(permissions: string[]): Promise<boolean> {
      for (const permission of permissions) {
        if (await hasPermission(session, permission)) {
          return true
        }
      }
      return false
    },
    
    async canAll(permissions: string[]): Promise<boolean> {
      for (const permission of permissions) {
        if (!(await hasPermission(session, permission))) {
          return false
        }
      }
      return true
    },
    
    async require(permission: string, redirectPath?: string): Promise<void> {
      await requirePermission(session, permission, redirectPath)
    }
  }
}

// Rate limiting helpers (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs
    rateLimitMap.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: limit - 1, resetTime }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime }
}

// IP address extraction helper
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP.trim()
  }
  
  return 'unknown'
}