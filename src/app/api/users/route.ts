import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { requireAuth, requirePermission, logUserAction, getClientIP } from '@/lib/auth-helpers'
import { prisma } from '@/lib/db'
import { AUTH_PERMISSIONS } from '@/constants/permissions'
import { env } from '@/lib/env'

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  branchRoles: z.array(z.object({
    branchId: z.string().uuid('Invalid branch ID'),
    roleId: z.string().uuid('Invalid role ID'),
  })).min(1, 'At least one branch-role assignment is required'),
})

const getUsersSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  search: z.string().optional(),
  branchId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  isActive: z.enum(['true', 'false', 'all']).optional().default('all'),
})

// GET /api/users - List users with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    await requirePermission(session, AUTH_PERMISSIONS.VIEW_USERS)

    const { searchParams } = new URL(request.url)
    const query = getUsersSchema.parse(Object.fromEntries(searchParams))

    const page = parseInt(query.page)
    const limit = parseInt(query.limit)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    if (query.isActive !== 'all') {
      where.isActive = query.isActive === 'true'
    }

    // Filter by branch or role if specified
    if (query.branchId || query.roleId) {
      where.userBranchRoles = {
        some: {
          ...(query.branchId && { branchId: query.branchId }),
          ...(query.roleId && { roleId: query.roleId }),
        }
      }
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          userBranchRoles: {
            include: {
              branch: {
                select: { id: true, name: true, code: true }
              },
              role: {
                select: { id: true, name: true, description: true }
              }
            }
          }
        }
      }),
      prisma.user.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    await logUserAction(
      session,
      'LIST_USERS',
      'users',
      `Listed users (page ${page}, ${users.length} results)`,
      { query, resultCount: users.length },
      getClientIP(request)
    )

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    })
  } catch (error) {
    console.error('List users error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    await requirePermission(session, AUTH_PERMISSIONS.MANAGE_USERS)

    const body = await request.json()
    const { email, fullName, phone, password, branchRoles } = createUserSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Validate branch-role combinations exist
    for (const { branchId, roleId } of branchRoles) {
      const [branch, role] = await Promise.all([
        prisma.branch.findUnique({ where: { id: branchId } }),
        prisma.role.findUnique({ where: { id: roleId } })
      ])

      if (!branch) {
        return NextResponse.json(
          { error: `Branch with ID ${branchId} not found` },
          { status: 400 }
        )
      }

      if (!role) {
        return NextResponse.json(
          { error: `Role with ID ${roleId} not found` },
          { status: 400 }
        )
      }
    }

    // Hash password
    const passwordHash = await hash(password, env.HASH_ROUNDS)

    // Create user with branch-role assignments in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          fullName,
          phone,
          passwordHash,
          isActive: true,
        }
      })

      // Create branch-role assignments
      await tx.userBranchRole.createMany({
        data: branchRoles.map(({ branchId, roleId }) => ({
          userId: newUser.id,
          branchId,
          roleId,
        }))
      })

      return newUser
    })

    // Fetch complete user data for response
    const completeUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        userBranchRoles: {
          include: {
            branch: {
              select: { id: true, name: true, code: true }
            },
            role: {
              select: { id: true, name: true, description: true }
            }
          }
        }
      }
    })

    await logUserAction(
      session,
      'CREATE_USER',
      'users',
      `Created user: ${email}`,
      { 
        userId: user.id, 
        email, 
        fullName,
        branchRoles: branchRoles.length 
      },
      getClientIP(request)
    )

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: completeUser
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create user error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}