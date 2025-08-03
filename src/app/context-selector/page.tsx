'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Users, ArrowRight, AlertCircle } from 'lucide-react'

interface GroupedContext {
  branch: {
    id: string
    name: string
    code: string
    address: string
  }
  roles: Array<{
    id: string
    name: string
    description?: string
    branchId: string
    roleId: string
  }>
}

export default function ContextSelectorPage() {
  const { session, availableContexts, switchContext, isLoading } = useAuth()
  const [selectedContext, setSelectedContext] = useState<{branchId: string, roleId: string} | null>(null)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Redirect if no session or already has context
  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login')
      return
    }

    if (!isLoading && session?.user?.selectedBranchId && session?.user?.selectedRoleId) {
      router.push('/dashboard')
      return
    }
  }, [session, isLoading, router])

  // Group contexts by branch
  const groupedContexts: GroupedContext[] = availableContexts.reduce((acc, context) => {
    const existingBranch = acc.find(item => item.branch.id === context.branchId)
    
    if (existingBranch) {
      existingBranch.roles.push({
        id: context.roleId,
        name: context.role.name,
        description: context.role.description,
        branchId: context.branchId,
        roleId: context.roleId,
      })
    } else {
      acc.push({
        branch: context.branch,
        roles: [{
          id: context.roleId,
          name: context.role.name,
          description: context.role.description,
          branchId: context.branchId,
          roleId: context.roleId,
        }]
      })
    }
    
    return acc
  }, [] as GroupedContext[])

  const handleContextSelect = (branchId: string, roleId: string) => {
    setSelectedContext({ branchId, roleId })
    setError('')
  }

  const handleContinue = async () => {
    if (!selectedContext) return

    setSwitching(true)
    setError('')

    try {
      const result = await switchContext(selectedContext.branchId, selectedContext.roleId)
      
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error || 'Failed to set context')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setSwitching(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session || availableContexts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              No Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              You don't have access to any branches or roles. Please contact your administrator.
            </p>
            <Button onClick={() => router.push('/login')} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Building2 className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Select Your Working Context
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose the branch and role you want to work with in this session
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {groupedContexts.map((group) => (
            <Card key={group.branch.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {group.branch.name}
                </CardTitle>
                <CardDescription>
                  {group.branch.code} • {group.branch.address}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {group.roles.map((role) => (
                    <div
                      key={`${role.branchId}-${role.roleId}`}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedContext?.branchId === role.branchId && 
                        selectedContext?.roleId === role.roleId
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleContextSelect(role.branchId, role.roleId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-gray-400" />
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {role.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            {role.description && (
                              <p className="text-sm text-gray-500">{role.description}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {role.name}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedContext || switching}
            loading={switching}
            size="lg"
            className="min-w-[200px]"
          >
            {switching ? 'Setting Context...' : (
              <>
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Welcome, {session.user.name}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            You can switch contexts later from the dashboard
          </p>
        </div>
      </div>
    </div>
  )
}