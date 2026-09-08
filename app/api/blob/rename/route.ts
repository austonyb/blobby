import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/guard"
import { renameEntry } from "@/lib/blob"
import { isValidFileName } from "@/lib/paths"

export async function POST(request: Request) {
  const auth = await requireApiSession()
  if ("response" in auth) return auth.response

  try {
    const body = (await request.json()) as {
      pathname?: string
      name?: string
      kind?: "file" | "folder"
    }

    if (!body.pathname) {
      return NextResponse.json({ error: "Missing pathname." }, { status: 400 })
    }
    if (body.pathname.includes("..")) {
      return NextResponse.json({ error: "Invalid path." }, { status: 400 })
    }

    const name = body.name?.trim() ?? ""
    if (!isValidFileName(name)) {
      return NextResponse.json({ error: "Enter a valid name." }, { status: 400 })
    }

    const kind =
      body.kind === "folder" || body.pathname.endsWith("/") ? "folder" : "file"
    const result = await renameEntry(body.pathname, kind, name)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not rename"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
