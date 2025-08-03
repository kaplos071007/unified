'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Building2,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  FileText,
  Bell,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  BarChart3,
  Workflow,
  Shield,
  Database,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { AUTH_PERMISSIONS, PROCUREMENT_PERMISSIONS, INVENTORY_PERMISSIONS, PAYROLL_PERMISSIONS, ACCOUNTING_PERMISSIONS, REPORTING_PERMISSIONS, SETTINGS_PERMISSIONS } from '@/constants/permissions'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavigationItem {
  name: string
  href: string
  icon: any
  permission?: string
  badge?: string
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Users', href: '/users', icon: Users, permission: AUTH_PERMISSIONS.VIEW_USERS },
  { name: 'Procurement', href: '/procurement', icon: ShoppingCart, permission: PROCUREMENT_PERMISSIONS.VIEW_PURCHASE_REQUESTS },
  { name: 'Inventory', href: '/inventory', icon: Package, permission: INVENTORY_PERMISSIONS.VIEW_INVENTORY },
  { name: 'Payroll', href: '/payroll', icon: DollarSign, permission: PAYROLL_PERMISSIONS.VIEW_PAYROLL },
  { name: 'Accounting', href: '/accounting', icon: Database, permission: ACCOUNTING_PERMISSIONS.VIEW_ACCOUNTS },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'Reports', href: '/reports', icon: FileText, permission: REPORTING_PERMISSIONS.VIEW_REPORTS },
  { name: 'Settings', href: '/settings', icon: Settings, permission: SETTINGS_PERMISSIONS.VIEW_SETTINGS },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, currentBranch, currentRole, logout, switchContext, availableContexts } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const handleLogout = () => {
    logout()
  }

  const handleContextSwitch = async (branchId: string, roleId: string) => {
    await switchContext(branchId, roleId)
  }

  // Filter navigation items based on permissions
  const filteredNavigation = navigation.filter(item => {
    if (!item.permission) return true
    // For now, we'll show all items. In a real app, you'd check permissions here
    return true
  })

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex h-full flex-col ${mobile ? 'w-full' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b">
        <Building2 className="h-8 w-8 text-primary" />
        <span className="ml-2 text-xl font-semibold">Enterprise Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-4">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => mobile && setSidebarOpen(false)}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
              {item.badge && (
                <Badge variant="secondary" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Current Context */}
      <div className="border-t p-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Current Context
        </div>
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Building2 className="h-4 w-4 mr-2 text-gray-400" />
            <span className="font-medium">{currentBranch?.name}</span>
            <Badge variant="outline" className="ml-2 text-xs">
              {currentBranch?.code}
            </Badge>
          </div>
          <div className="flex items-center text-sm">
            <Shield className="h-4 w-4 mr-2 text-gray-400" />
            <span className="font-medium">
              {currentRole?.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex w-64 flex-col bg-white border-r">
          <Sidebar />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar mobile />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>

              {/* Context Switcher */}
              {availableContexts.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {currentBranch?.code}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Switch Context</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {availableContexts.map((context) => (
                      <DropdownMenuItem
                        key={`${context.branchId}-${context.roleId}`}
                        onClick={() => handleContextSwitch(context.branchId, context.roleId)}
                        className="flex flex-col items-start"
                      >
                        <div className="font-medium">{context.branch.name}</div>
                        <div className="text-sm text-gray-500">
                          {context.role.name.replace(/_/g, ' ')}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-3 px-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">
                        {getInitials(session?.user?.name || session?.user?.email || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {session?.user?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {session?.user?.email}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/notifications">Notifications</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}