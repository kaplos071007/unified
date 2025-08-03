import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { prisma } from './db'
import { env } from './env'
import { logger } from './logger'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        branchId: { label: 'Branch ID', type: 'text' },
        roleId: { label: 'Role ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          logger.warn('Login attempt without email or password')
          return null
        }

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              userBranchRoles: {
                include: {
                  branch: true,
                  role: {
                    include: {
                      permissions: {
                        include: {
                          permission: true
                        }
                      }
                    }
                  }
                }
              },
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          })

          if (!user || !user.isActive) {
            logger.warn(`Login attempt for inactive/non-existent user: ${credentials.email}`)
            return null
          }

          // Verify password
          const isPasswordValid = await compare(credentials.password, user.passwordHash)
          if (!isPasswordValid) {
            logger.warn(`Invalid password attempt for user: ${credentials.email}`)
            return null
          }

          // If branch and role context are provided, validate them
          if (credentials.branchId && credentials.roleId) {
            const userBranchRole = user.userBranchRoles.find(
              ubr => ubr.branchId === credentials.branchId && ubr.roleId === credentials.roleId
            )

            if (!userBranchRole) {
              logger.warn(`Invalid branch/role context for user: ${credentials.email}`)
              return null
            }
          }

          logger.info(`Successful login for user: ${credentials.email}`)
          
          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            phone: user.phone,
            userBranchRoles: user.userBranchRoles,
            permissions: user.permissions,
            selectedBranchId: credentials.branchId,
            selectedRoleId: credentials.roleId,
          }
        } catch (error) {
          logger.error('Login error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.phone = user.phone
        token.userBranchRoles = user.userBranchRoles
        token.permissions = user.permissions
        token.selectedBranchId = user.selectedBranchId
        token.selectedRoleId = user.selectedRoleId
      }

      // Handle session update (context switching)
      if (trigger === 'update' && session) {
        if (session.branchId && session.roleId) {
          token.selectedBranchId = session.branchId
          token.selectedRoleId = session.roleId
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.phone = token.phone as string
        session.user.userBranchRoles = token.userBranchRoles as any
        session.user.permissions = token.permissions as any
        session.user.selectedBranchId = token.selectedBranchId as string
        session.user.selectedRoleId = token.selectedRoleId as string

        // Get current branch and role context
        if (session.user.selectedBranchId && session.user.selectedRoleId) {
          const currentContext = session.user.userBranchRoles?.find(
            (ubr: any) => ubr.branchId === session.user.selectedBranchId && ubr.roleId === session.user.selectedRoleId
          )
          
          if (currentContext) {
            session.user.currentBranch = currentContext.branch
            session.user.currentRole = currentContext.role
          }
        }
      }
      return session
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Allow sign in
      return true
    },
    async redirect({ url, baseUrl }) {
      // Redirect to context selector if no context is selected
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: env.NEXTAUTH_SECRET,
}

// Helper function to get user permissions
export async function getUserPermissions(userId: string, branchId?: string, roleId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userBranchRoles: {
        where: branchId && roleId ? {
          branchId,
          roleId
        } : undefined,
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      },
      permissions: {
        include: {
          permission: true
        }
      }
    }
  })

  if (!user) return []

  // Combine role permissions and user-specific permissions
  const rolePermissions = user.userBranchRoles.flatMap(
    ubr => ubr.role.permissions.map(rp => rp.permission.name)
  )
  
  const userPermissions = user.permissions.map(up => up.permission.name)
  
  return [...new Set([...rolePermissions, ...userPermissions])]
}

// Helper function to check if user has permission
export async function hasPermission(
  userId: string, 
  permission: string, 
  branchId?: string, 
  roleId?: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, branchId, roleId)
  return permissions.includes(permission)
}