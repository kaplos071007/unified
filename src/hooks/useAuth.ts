'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import type { Session } from 'next-auth'

export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (credentials: {
    email: string
    password: string
    branchId?: string
    roleId?: string
  }) => {
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        ...credentials,
        redirect: false,
      })
      
      if (result?.error) {
        throw new Error(result.error)
      }
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async (callbackUrl = '/login') => {
    setIsLoading(true)
    try {
      await signOut({ callbackUrl })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const switchContext = useCallback(async (branchId: string, roleId: string) => {
    setIsLoading(true)
    try {
      await update({ branchId, roleId })
      router.refresh()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Context switch failed' 
      }
    } finally {
      setIsLoading(false)
    }
  }, [update, router])

  const refreshSession = useCallback(async () => {
    try {
      await update()
    } catch (error) {
      console.error('Failed to refresh session:', error)
    }
  }, [update])

  return {
    // Session data
    session,
    user: session?.user,
    isAuthenticated: !!session,
    isLoading: status === 'loading' || isLoading,
    
    // User context
    currentBranch: session?.user?.currentBranch,
    currentRole: session?.user?.currentRole,
    availableContexts: session?.user?.userBranchRoles || [],
    hasContext: !!(session?.user?.selectedBranchId && session?.user?.selectedRoleId),
    
    // Actions
    login,
    logout,
    switchContext,
    refreshSession,
  }
}

export function useRequireAuth() {
  const { session, isLoading } = useAuth()
  const router = useRouter()

  if (!isLoading && !session) {
    router.push('/login')
    return null
  }

  return session
}

export function useRequireContext() {
  const { session, hasContext, isLoading } = useAuth()
  const router = useRouter()

  if (!isLoading && session && !hasContext) {
    router.push('/context-selector')
    return null
  }

  return session
}