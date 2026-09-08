import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/guard"
import { deletePath } from "@/lib/blob"

export async function POST(request: Request) {
  const auth = await requireApiSession()
  if ("response" in auth) return auth.response

  try {
    const body = (await request.json()) as {
      pathname?: string
      kind?: "file" | "folder"
    }

    if (!body.pathname || (body.kind !== "file" && body.kind !== "folder")) {
      return NextResponse.json({ error: "Missing pathname or kind." }, { status: 400 })
    }

    if (body.pathname.includes("..")) {
      return NextResponse.json({ error: "Invalid path." }, { status: 400 })
    }

    await deletePath(body.pathname, body.kind)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
