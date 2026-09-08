import { NextResponse } from "next/server"

import { getSession, type SessionUser } from "@/lib/session"

export async function requireApiSession(): Promise<
  { session: SessionUser } | { response: NextResponse }
> {
  const session = await getSession()
  if (!session) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { session }
}
