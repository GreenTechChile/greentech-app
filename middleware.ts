import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware de protección de rutas.
 * Verifica la cookie gt_auth antes de permitir acceso a /admin/* y /socio/*.
 * La cookie es establecida por login-page.tsx al iniciar sesión y
 * eliminada por los sidebars al cerrar sesión.
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const authCookie = req.cookies.get('gt_auth')

  if (!authCookie) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/socio/:path*'],
}
