'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ShoppingCart, 
  Plus, 
  FileText, 
  Truck, 
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Package
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { PROCUREMENT_PERMISSIONS } from '@/constants/permissions'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import Link from 'next/link'

interface ProcurementStats {
  totalPurchaseRequests: number
  pendingApproval: number
  activePurchaseOrders: number
  totalSpentThisMonth: number
  pendingDeliveries: number
}

interface RecentActivity {
  id: string
  type: 'PR_CREATED' | 'PR_APPROVED' | 'PO_CREATED' | 'GOODS_RECEIVED'
  title: string
  description: string
  amount?: number
  status: string
  createdAt: string
  user: {
    name: string
  }
}

export default function ProcurementPage() {
  const { session } = useAuth()
  const { hasPermission: canViewPRs } = usePermission(PROCUREMENT_PERMISSIONS.VIEW_PURCHASE_REQUESTS)
  const { hasPermission: canCreatePRs } = usePermission(PROCUREMENT_PERMISSIONS.CREATE_PURCHASE_REQUESTS)
  const { hasPermission: canViewPOs } = usePermission(PROCUREMENT_PERMISSIONS.VIEW_PURCHASE_ORDERS)

  const [stats, setStats] = useState<ProcurementStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // In a real implementation, you'd have dedicated API endpoints for dashboard data
      // For now, we'll simulate the data
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setStats({
        totalPurchaseRequests: 45,
        pendingApproval: 8,
        activePurchaseOrders: 12,
        totalSpentThisMonth: 125000,
        pendingDeliveries: 5
      })

      setRecentActivity([
        {
          id: '1',
          type: 'PR_CREATED',
          title: 'Office Supplies Request',
          description: 'New purchase request for office supplies',
          amount: 2500,
          status: 'PENDING_APPROVAL',
          createdAt: new Date().toISOString(),
          user: { name: 'John Doe' }
        },
        {
          id: '2',
          type: 'PO_CREATED',
          title: 'IT Equipment Purchase Order',
          description: 'Purchase order sent to TechCorp Ltd.',
          amount: 15000,
          status: 'SENT',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user: { name: 'Jane Smith' }
        },
        {
          id: '3',
          type: 'PR_APPROVED',
          title: 'Marketing Materials Request',
          description: 'Purchase request approved by manager',
          amount: 3500,
          status: 'APPROVED',
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          user: { name: 'Mike Johnson' }
        }
      ])

      setError('')
    } catch (error) {
      setError('Failed to load dashboard data')
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canViewPRs || canViewPOs) {
      fetchDashboardData()
    }
  }, [canViewPRs, canViewPOs])

  if (!canViewPRs && !canViewPOs) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view procurement data.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'PR_CREATED':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'PR_APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PO_CREATED':
        return <ShoppingCart className="h-4 w-4 text-purple-500" />
      case 'GOODS_RECEIVED':
        return <Package className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Procurement Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage purchase requests, orders, and vendor relationships
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {canCreatePRs && (
            <Button asChild>
              <Link href="/procurement/purchase-requests/new">
                <Plus className="h-4 w-4 mr-2" />
                New Purchase Request
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total PRs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPurchaseRequests}</div>
              <p className="text-xs text-muted-foreground">
                Purchase requests this year
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingApproval}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active POs</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activePurchaseOrders}</div>
              <p className="text-xs text-muted-foreground">
                Purchase orders in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalSpentThisMonth)}
              </div>
              <p className="text-xs text-muted-foreground">
                This month's spending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Deliveries</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.pendingDeliveries}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting delivery
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common procurement tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {canCreatePRs && (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/procurement/purchase-requests/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Purchase Request
                </Link>
              </Button>
            )}
            
            {canViewPRs && (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/procurement/purchase-requests">
                  <FileText className="h-4 w-4 mr-2" />
                  View Purchase Requests
                </Link>
              </Button>
            )}
            
            {canViewPOs && (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/procurement/purchase-orders">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  View Purchase Orders
                </Link>
              </Button>
            )}
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/procurement/vendors">
                <Truck className="h-4 w-4 mr-2" />
                Manage Vendors
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest procurement activities</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Recent procurement activities will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </h4>
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {activity.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          by {activity.user.name}
                        </span>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          {activity.amount && (
                            <span className="font-medium text-green-600">
                              {formatCurrency(activity.amount)}
                            </span>
                          )}
                          <span>{formatDate(activity.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Procurement Status Overview</CardTitle>
          <CardDescription>Current status of procurement processes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900">Purchase Requests</h3>
              <p className="text-sm text-gray-500 mt-1">
                Create and manage purchase requests from various departments
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <ShoppingCart className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-900">Purchase Orders</h3>
              <p className="text-sm text-gray-500 mt-1">
                Convert approved requests into purchase orders for vendors
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Truck className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900">Goods Receipt</h3>
              <p className="text-sm text-gray-500 mt-1">
                Track deliveries and complete the procurement cycle
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}