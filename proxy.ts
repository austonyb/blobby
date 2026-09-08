import { NextRequest, NextResponse } from "next/server"

import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token"

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/invite/")
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const login = new URL("/login", request.url)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
