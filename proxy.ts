import { auth } from '@/auth'

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth
  const isAllowedEmail = req.auth?.user?.email === process.env.ALLOWED_EMAIL

  if (!isLoggedIn || !isAllowedEmail) {
    return Response.redirect(new URL('/login', req.url))
  }
})

export const config = {
  matcher: ['/((?!login|api/auth).*)'],
}
