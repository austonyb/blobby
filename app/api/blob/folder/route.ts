import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/guard"
import { createEmptyFolder } from "@/lib/blob"
import { isValidFolderName, joinPath, normalizePrefix } from "@/lib/paths"

export async function POST(request: Request) {
  const auth = await requireApiSession()
  if ("response" in auth) return auth.response

  try {
    const body = (await request.json()) as { prefix?: string; name?: string }
    const name = body.name?.trim() ?? ""
    if (!isValidFolderName(name)) {
      return NextResponse.json({ error: "Enter a valid folder name." }, { status: 400 })
    }

    const pathname = joinPath(normalizePrefix(body.prefix), name)
    const folder = await createEmptyFolder(pathname)
    return NextResponse.json(folder)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create folder"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
