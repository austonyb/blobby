import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/guard"
import { deletePath } from "@/lib/blob"

type DeleteItem = { pathname: string; kind: "file" | "folder" }

function parseItems(body: {
  pathname?: string
  kind?: "file" | "folder"
  items?: DeleteItem[]
}): DeleteItem[] | null {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items
  }
  if (body.pathname && (body.kind === "file" || body.kind === "folder")) {
    return [{ pathname: body.pathname, kind: body.kind }]
  }
  return null
}

export async function POST(request: Request) {
  const auth = await requireApiSession()
  if ("response" in auth) return auth.response

  try {
    const body = (await request.json()) as {
      pathname?: string
      kind?: "file" | "folder"
      items?: DeleteItem[]
    }

    const items = parseItems(body)
    if (!items) {
      return NextResponse.json({ error: "Missing pathname or kind." }, { status: 400 })
    }

    for (const item of items) {
      if (!item.pathname || (item.kind !== "file" && item.kind !== "folder")) {
        return NextResponse.json({ error: "Each item needs a pathname and kind." }, { status: 400 })
      }
      if (item.pathname.includes("..")) {
        return NextResponse.json({ error: "Invalid path." }, { status: 400 })
      }
      await deletePath(item.pathname, item.kind)
    }

    return NextResponse.json({ ok: true, deleted: items.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
