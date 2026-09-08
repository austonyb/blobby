import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/guard"
import { renamePath } from "@/lib/blob"
import { basename, isValidFileName, joinPath, normalizePrefix } from "@/lib/paths"

export async function POST(request: Request) {
  const auth = await requireApiSession()
  if ("response" in auth) return auth.response

  try {
    const body = (await request.json()) as {
      pathname?: string
      name?: string
    }

    if (!body.pathname) {
      return NextResponse.json({ error: "Missing pathname." }, { status: 400 })
    }

    const name = body.name?.trim() ?? ""
    if (!isValidFileName(name)) {
      return NextResponse.json({ error: "Enter a valid name." }, { status: 400 })
    }

    const currentName = basename(body.pathname)
    const parent = body.pathname.endsWith("/")
      ? normalizePrefix(body.pathname.replace(/\/+$/, "").split("/").slice(0, -1).join("/"))
      : normalizePrefix(body.pathname.slice(0, Math.max(0, body.pathname.length - currentName.length)))

    if (body.pathname.endsWith("/")) {
      return NextResponse.json(
        { error: "Renaming folders is not supported yet." },
        { status: 400 },
      )
    }

    const toPathname = joinPath(parent, name)
    const result = await renamePath(body.pathname, toPathname)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not rename"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
