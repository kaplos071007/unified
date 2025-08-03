'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Lock, Mail, AlertCircle } from 'lucide-react'

interface UserBranchRole {
  id: string
  branchId: string
  roleId: string
  branch: {
    id: string
    name: string
    code: string
  }
  role: {
    id: string
    name: string
    description: string
  }
}

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'context'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [availableContexts, setAvailableContexts] = useState<UserBranchRole[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
        return
      }

      // Get session to check if context selection is needed
      const session = await getSession()
      if (session?.user?.userBranchRoles && session.user.userBranchRoles.length > 1) {
        setAvailableContexts(session.user.userBranchRoles)
        setStep('context')
      } else if (session?.user?.userBranchRoles && session.user.userBranchRoles.length === 1) {
        // Auto-select single context
        const context = session.user.userBranchRoles[0]
        await selectContext(context.branchId, context.roleId)
      } else {
        setError('No branch/role assignments found. Contact administrator.')
      }
    } catch (error) {
      setError('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const selectContext = async (branchId: string, roleId: string) => {
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        branchId,
        roleId,
        redirect: false,
      })

      if (result?.error) {
        setError('Failed to set context')
        return
      }

      router.push(callbackUrl)
    } catch (error) {
      setError('An error occurred while setting context')
    } finally {
      setLoading(false)
    }
  }

  const handleContextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedBranch && selectedRole) {
      selectContext(selectedBranch, selectedRole)
    }
  }

  const groupedContexts = availableContexts.reduce((acc, context) => {
    const branchName = context.branch.name
    if (!acc[branchName]) {
      acc[branchName] = []
    }
    acc[branchName].push(context)
    return acc
  }, {} as Record<string, UserBranchRole[]>)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Enterprise Admin System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 'login' ? 'Sign in to your account' : 'Select your working context'}
          </p>
        </div>

        {step === 'login' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Sign In
              </CardTitle>
              <CardDescription>
                Enter your credentials to access the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" loading={loading}>
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Select Context
              </CardTitle>
              <CardDescription>
                Choose the branch and role for this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleContextSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Branch & Role</Label>
                  <Select
                    value={`${selectedBranch}:${selectedRole}`}
                    onValueChange={(value) => {
                      const [branchId, roleId] = value.split(':')
                      setSelectedBranch(branchId)
                      setSelectedRole(roleId)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch and role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(groupedContexts).map(([branchName, contexts]) => (
                        <div key={branchName}>
                          <div className="px-2 py-1 text-sm font-medium text-gray-500">
                            {branchName}
                          </div>
                          {contexts.map((context) => (
                            <SelectItem
                              key={`${context.branchId}:${context.roleId}`}
                              value={`${context.branchId}:${context.roleId}`}
                            >
                              <div className="flex flex-col">
                                <span>{context.role.name}</span>
                                <span className="text-xs text-gray-500">
                                  {context.role.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('login')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    loading={loading}
                    disabled={!selectedBranch || !selectedRole}
                  >
                    Continue
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-gray-500">
          <p>Demo Credentials:</p>
          <p>Super Admin: admin@enterprise.com / admin123</p>
          <p>HR Manager: hr.manager@enterprise.com / password123</p>
        </div>
      </div>
    </div>
  )
}