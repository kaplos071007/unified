import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Allow access to auth pages and API routes
    if (
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon')
    ) {
      return NextResponse.next()
    }

    // Redirect to login if not authenticated
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check if user has selected branch and role context
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/app')) {
      if (!token.selectedBranchId || !token.selectedRoleId) {
        return NextResponse.redirect(new URL('/context-selector', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        const { pathname } = req.nextUrl
        if (
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/favicon')
        ) {
          return true
        }

        // Require authentication for all other routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
}