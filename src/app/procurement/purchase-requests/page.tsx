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
  FileText, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Send
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { PROCUREMENT_PERMISSIONS } from '@/constants/permissions'
import { getInitials, formatDate, formatCurrency, getStatusColor } from '@/lib/utils'
import Link from 'next/link'

interface PurchaseRequestItem {
  id: string
  quantity: number
  estimatedUnitPrice: number
  specifications?: string
  item: {
    id: string
    name: string
    code: string
    unit: string
  }
}

interface PurchaseRequest {
  id: string
  prNumber: string
  title: string
  description?: string
  status: string
  priority: string
  totalEstimatedAmount: number
  requiredDate: string
  createdAt: string
  requestedBy: {
    id: string
    fullName: string
    email: string
  }
  branch: {
    id: string
    name: string
    code: string
  }
  items: PurchaseRequestItem[]
  _count: {
    items: number
  }
}

interface PurchaseRequestsResponse {
  purchaseRequests: PurchaseRequest[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export default function PurchaseRequestsPage() {
  const { session } = useAuth()
  const { hasPermission: canViewPRs } = usePermission(PROCUREMENT_PERMISSIONS.VIEW_PURCHASE_REQUESTS)
  const { hasPermission: canCreatePRs } = usePermission(PROCUREMENT_PERMISSIONS.CREATE_PURCHASE_REQUESTS)
  const { hasPermission: canApprovePRs } = usePermission(PROCUREMENT_PERMISSIONS.APPROVE_PURCHASE_REQUESTS)

  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PurchaseRequestsResponse['pagination'] | null>(null)

  const fetchPurchaseRequests = async (page = 1, search = searchTerm, status = statusFilter, priority = priorityFilter) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(status !== 'all' && { status }),
        ...(priority !== 'all' && { priority }),
      })

      const response = await fetch(`/api/procurement/purchase-requests?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch purchase requests')
      }

      const data: PurchaseRequestsResponse = await response.json()
      setPurchaseRequests(data.purchaseRequests)
      setPagination(data.pagination)
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load purchase requests')
      setPurchaseRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canViewPRs) {
      fetchPurchaseRequests()
    }
  }, [canViewPRs])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
    fetchPurchaseRequests(1, value, statusFilter, priorityFilter)
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
    fetchPurchaseRequests(1, searchTerm, value, priorityFilter)
  }

  const handlePriorityFilter = (value: string) => {
    setPriorityFilter(value)
    setCurrentPage(1)
    fetchPurchaseRequests(1, searchTerm, statusFilter, value)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchPurchaseRequests(page, searchTerm, statusFilter, priorityFilter)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'LOW':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'PENDING_APPROVAL':
        return <Clock className="h-4 w-4 text-orange-500" />
      case 'DRAFT':
        return <Edit className="h-4 w-4 text-gray-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  if (!canViewPRs) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view purchase requests.
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
          <h1 className="text-3xl font-bold text-gray-900">Purchase Requests</h1>
          <p className="text-gray-600 mt-1">
            Manage and track purchase requests across the organization
          </p>
        </div>
        
        {canCreatePRs && (
          <Button asChild>
            <Link href="/procurement/purchase-requests/new">
              <Plus className="h-4 w-4 mr-2" />
              New Purchase Request
            </Link>
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
                  placeholder="Search by title, description, or PR number..."
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
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={handlePriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
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

      {/* Purchase Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Purchase Requests
            {pagination && (
              <Badge variant="outline">
                {pagination.totalCount} total
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            All purchase requests with their current status and details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : purchaseRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No purchase requests found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first purchase request'
                }
              </p>
              {canCreatePRs && !searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
                <Button asChild className="mt-4">
                  <Link href="/procurement/purchase-requests/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Purchase Request
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {purchaseRequests.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(pr.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {pr.title}
                        </h3>
                        <Badge className={getPriorityColor(pr.priority)}>
                          {pr.priority}
                        </Badge>
                        <Badge className={getStatusColor(pr.status)}>
                          {pr.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {pr.prNumber} • {pr.description || 'No description'}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-xs">
                              {getInitials(pr.requestedBy.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{pr.requestedBy.fullName}</span>
                        </div>
                        
                        <span>•</span>
                        <span>{pr.branch.code}</span>
                        <span>•</span>
                        <span>{pr._count.items} items</span>
                        <span>•</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(pr.totalEstimatedAmount)}
                        </span>
                        <span>•</span>
                        <span>Required: {formatDate(pr.requiredDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right text-sm text-gray-500">
                      <p>Created</p>
                      <p>{formatDate(pr.createdAt)}</p>
                    </div>
                    
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/procurement/purchase-requests/${pr.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pagination?.totalCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              All purchase requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {purchaseRequests.filter(pr => pr.status === 'PENDING_APPROVAL').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {purchaseRequests.filter(pr => pr.status === 'APPROVED').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for PO
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                purchaseRequests.reduce((sum, pr) => sum + pr.totalEstimatedAmount, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated total
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}