import { jwtVerify, SignJWT } from "jose"

export const SESSION_COOKIE = "blobby_session"
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14

export type SessionUser = {
  id: string
  username: string
  role: string
}

function secretKey() {
  const secret = process.env.AUTH_SECRET || process.env.BLOB_READ_WRITE_TOKEN
  if (!secret) {
    throw new Error("AUTH_SECRET is not set.")
  }
  return new TextEncoder().encode(secret)
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey())
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    const id = typeof payload.sub === "string" ? payload.sub : ""
    const username =
      typeof payload.username === "string" ? payload.username : ""
    const role = typeof payload.role === "string" ? payload.role : "user"
    if (!id || !username) return null
    return { id, username, role }
  } catch {
    return null
  }
}
