import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware() {
    // Add any additional middleware logic here
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Define protected routes
        // `/admin`은 API가 이미 ADMIN_EMAILS로 막고 있지만 화면 자체는 익명에게 열려 있었다.
        // 도구를 없애는 대신 인증 뒤로 옮긴다 (DS0-3).
        const protectedPaths = ['/library', '/upload', '/profile', '/admin']
        const isProtectedPath = protectedPaths.some(path => 
          req.nextUrl.pathname.startsWith(path)
        )

        // Allow access to non-protected routes
        if (!isProtectedPath) {
          return true
        }

        // Require authentication for protected routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
}