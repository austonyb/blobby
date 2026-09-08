import { cookies } from "next/headers"

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionUser,
} from "@/lib/session-token"

export { SESSION_COOKIE, verifySessionToken, type SessionUser }

export async function createSession(user: SessionUser) {
  const token = await signSessionToken(user)
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function clearSession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}
