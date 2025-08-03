'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

export function usePermission(permission: string) {
  const { session, isLoading: authLoading } = useAuth()
  const [hasPermission, setHasPermission] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkPermission = useCallback(async () => {
    if (!session?.user?.id || authLoading) {
      setHasPermission(false)
      setIsLoading(authLoading)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/permissions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission })
      })

      if (response.ok) {
        const data = await response.json()
        setHasPermission(data.hasPermission)
      } else {
        setHasPermission(false)
      }
    } catch (error) {
      console.error('Permission check failed:', error)
      setHasPermission(false)
    } finally {
      setIsLoading(false)
    }
  }, [session, permission, authLoading])

  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  return {
    hasPermission,
    isLoading,
    refresh: checkPermission
  }
}

export function usePermissions(permissions: string[]) {
  const { session, isLoading: authLoading } = useAuth()
  const [permissionMap, setPermissionMap] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  const checkPermissions = useCallback(async () => {
    if (!session?.user?.id || authLoading) {
      setPermissionMap({})
      setIsLoading(authLoading)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/permissions/check-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      })

      if (response.ok) {
        const data = await response.json()
        setPermissionMap(data.permissions || {})
      } else {
        setPermissionMap({})
      }
    } catch (error) {
      console.error('Permissions check failed:', error)
      setPermissionMap({})
    } finally {
      setIsLoading(false)
    }
  }, [session, permissions, authLoading])

  useEffect(() => {
    checkPermissions()
  }, [checkPermissions])

  const hasPermission = useCallback((permission: string) => {
    return permissionMap[permission] || false
  }, [permissionMap])

  const hasAnyPermission = useCallback((perms: string[]) => {
    return perms.some(perm => permissionMap[perm])
  }, [permissionMap])

  const hasAllPermissions = useCallback((perms: string[]) => {
    return perms.every(perm => permissionMap[perm])
  }, [permissionMap])

  return {
    permissionMap,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    refresh: checkPermissions
  }
}

// Hook for role-based checks
export function useRole() {
  const { currentRole, session } = useAuth()

  const hasRole = useCallback((roleName: string) => {
    return currentRole?.name === roleName
  }, [currentRole])

  const hasAnyRole = useCallback((roleNames: string[]) => {
    return roleNames.includes(currentRole?.name || '')
  }, [currentRole])

  const isAdmin = useCallback(() => {
    const adminRoles = ['super_admin', 'admin', 'branch_manager']
    return adminRoles.includes(currentRole?.name || '')
  }, [currentRole])

  const isManager = useCallback(() => {
    const managerRoles = [
      'super_admin', 'admin', 'branch_manager',
      'hr_manager', 'finance_manager', 'procurement_manager', 'inventory_manager'
    ]
    return managerRoles.includes(currentRole?.name || '')
  }, [currentRole])

  return {
    currentRole,
    hasRole,
    hasAnyRole,
    isAdmin: isAdmin(),
    isManager: isManager(),
    isSuperAdmin: hasRole('super_admin'),
    roleHierarchy: currentRole?.name || 'employee'
  }
}

// Hook for branch-based checks
export function useBranch() {
  const { currentBranch, availableContexts } = useAuth()

  const canAccessBranch = useCallback((branchId: string) => {
    return availableContexts.some(context => context.branchId === branchId)
  }, [availableContexts])

  const getBranchRoles = useCallback((branchId: string) => {
    return availableContexts
      .filter(context => context.branchId === branchId)
      .map(context => context.role)
  }, [availableContexts])

  const getAllBranches = useCallback(() => {
    const branches = availableContexts.map(context => context.branch)
    return branches.filter((branch, index, self) => 
      index === self.findIndex(b => b.id === branch.id)
    )
  }, [availableContexts])

  return {
    currentBranch,
    availableBranches: getAllBranches(),
    canAccessBranch,
    getBranchRoles,
    isHeadOffice: currentBranch?.code === 'HO'
  }
}