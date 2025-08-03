'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  AlertCircle,
  Building2,
  Shield
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { AUTH_PERMISSIONS } from '@/constants/permissions'
import { getInitials, formatDate, getStatusColor } from '@/lib/utils'

interface User {
  id: string
  email: string
  fullName: string
  phone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  userBranchRoles: Array<{
    branch: {
      id: string
      name: string
      code: string
    }
    role: {
      id: string
      name: string
      description?: string
    }
  }>
}

interface UsersResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export default function UsersPage() {
  const { session } = useAuth()
  const { hasPermission: canViewUsers } = usePermission(AUTH_PERMISSIONS.VIEW_USERS)
  const { hasPermission: canManageUsers } = usePermission(AUTH_PERMISSIONS.MANAGE_USERS)

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<UsersResponse['pagination'] | null>(null)

  const fetchUsers = async (page = 1, search = searchTerm, status = statusFilter) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(status !== 'all' && { isActive: status }),
      })

      const response = await fetch(`/api/users?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data: UsersResponse = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canViewUsers) {
      fetchUsers()
    }
  }, [canViewUsers])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
    fetchUsers(1, value, statusFilter)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
    fetchUsers(1, searchTerm, value)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchUsers(page, searchTerm, statusFilter)
  }

  if (!canViewUsers) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view users.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">
            Manage system users, roles, and permissions
          </p>
        </div>
        
        {canManageUsers && (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="true">Active Only</SelectItem>
                <SelectItem value="false">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users
            {pagination && (
              <Badge variant="outline">
                {pagination.totalCount} total
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            System users with their assigned roles and branches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first user'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {user.fullName}
                        </h3>
                        <Badge 
                          className={getStatusColor(user.isActive ? 'active' : 'inactive')}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-500 truncate">
                        {user.email}
                      </p>
                      
                      {user.phone && (
                        <p className="text-sm text-gray-500">
                          {user.phone}
                        </p>
                      )}
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        {user.userBranchRoles.map((ubr, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Building2 className="h-3 w-3 mr-1" />
                            {ubr.branch.code}
                            <Shield className="h-3 w-3 mx-1" />
                            {ubr.role.name.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right text-sm text-gray-500">
                      <p>Created</p>
                      <p>{formatDate(user.createdAt)}</p>
                    </div>
                    
                    {canManageUsers && (
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} results
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPreviousPage}
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pagination?.totalCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Branch</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {session?.user?.currentBranch?.code || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {session?.user?.currentBranch?.name || 'No branch selected'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}