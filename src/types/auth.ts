import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT } from 'next-auth/jwt'

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      phone?: string
      userBranchRoles?: UserBranchRole[]
      permissions?: UserPermission[]
      selectedBranchId?: string
      selectedRoleId?: string
      currentBranch?: Branch
      currentRole?: Role
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    id: string
    email: string
    name: string
    phone?: string
    userBranchRoles?: UserBranchRole[]
    permissions?: UserPermission[]
    selectedBranchId?: string
    selectedRoleId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    name: string
    phone?: string
    userBranchRoles?: UserBranchRole[]
    permissions?: UserPermission[]
    selectedBranchId?: string
    selectedRoleId?: string
  }
}

// Database types
export interface User {
  id: string
  email: string
  passwordHash: string
  fullName: string
  phone?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Branch {
  id: string
  name: string
  code: string
  address: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Role {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  permissions?: RolePermission[]
}

export interface Permission {
  id: string
  name: string
  description?: string
  module?: string
  createdAt: Date
}

export interface UserBranchRole {
  id: string
  userId: string
  branchId: string
  roleId: string
  createdAt: Date
  user?: User
  branch?: Branch
  role?: Role
}

export interface RolePermission {
  id: string
  roleId: string
  permissionId: string
  createdAt: Date
  role?: Role
  permission?: Permission
}

export interface UserPermission {
  id: string
  userId: string
  permissionId: string
  createdAt: Date
  user?: User
  permission?: Permission
}

export interface SessionContext {
  branchId: string
  roleId: string
  branch: Branch
  role: Role
  permissions: string[]
}

// Auth-related request/response types
export interface LoginRequest {
  email: string
  password: string
  branchId?: string
  roleId?: string
}

export interface LoginResponse {
  success: boolean
  message: string
  requiresContextSelection?: boolean
  availableContexts?: UserBranchRole[]
}

export interface ContextSwitchRequest {
  branchId: string
  roleId: string
}

export interface CreateUserRequest {
  email: string
  fullName: string
  phone?: string
  password: string
  branchRoles: Array<{
    branchId: string
    roleId: string
  }>
}

export interface UpdateUserRequest {
  id: string
  email?: string
  fullName?: string
  phone?: string
  isActive?: boolean
  branchRoles?: Array<{
    branchId: string
    roleId: string
  }>
}

export interface ResetPasswordRequest {
  email: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface OTPRequest {
  userId: string
  type: 'EMAIL' | 'SMS'
}

export interface VerifyOTPRequest {
  userId: string
  code: string
  type: 'EMAIL' | 'SMS'
}

// Permission checking types
export interface PermissionCheck {
  permission: string
  branchId?: string
  roleId?: string
}

export interface HasPermissionResponse {
  hasPermission: boolean
  permissions: string[]
}