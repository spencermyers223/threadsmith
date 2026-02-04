import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Always refresh the session - this updates tokens if needed
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // For API routes, just return response with refreshed cookies (no redirects)
  if (pathname.startsWith('/api')) {
    return response
  }

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/drafts', '/settings', '/profile', '/generate', '/calendar', '/creator-hub', '/customization', '/analytics']
  const isProtectedPath = protectedPaths.some(path =>
    pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect authenticated users away from landing page to creator-hub
  if (pathname === '/' && user) {
    return NextResponse.redirect(new URL('/creator-hub', request.url))
  }

  // Redirect old /generate route to /creator-hub
  if (pathname === '/generate' && user) {
    return NextResponse.redirect(new URL('/creator-hub', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Now includes API routes for session refresh!
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
