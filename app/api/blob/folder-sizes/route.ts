import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/guard"
import { computeFolderSizes } from "@/lib/blob"
import { normalizePrefix } from "@/lib/paths"

export async function POST(request: Request) {
  const auth = await requireApiSession()
  if ("response" in auth) return auth.response

  try {
    const body = (await request.json()) as { prefix?: string }
    const sizes = await computeFolderSizes(normalizePrefix(body.prefix))
    return NextResponse.json({ sizes })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not compute folder sizes"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
