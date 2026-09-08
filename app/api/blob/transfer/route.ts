import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/guard"
import { transferItems } from "@/lib/blob"
import { normalizePrefix } from "@/lib/paths"
import type { TransferItem, TransferMode } from "@/lib/transfer"

export async function POST(request: Request) {
  const auth = await requireApiSession()
  if ("response" in auth) return auth.response

  try {
    const body = (await request.json()) as {
      mode?: TransferMode
      destinationPrefix?: string
      items?: TransferItem[]
    }

    if (body.mode !== "copy" && body.mode !== "move") {
      return NextResponse.json({ error: "Mode must be copy or move." }, { status: 400 })
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Select at least one item." }, { status: 400 })
    }

    const items: TransferItem[] = []
    for (const item of body.items) {
      if (!item?.pathname || (item.kind !== "file" && item.kind !== "folder")) {
        return NextResponse.json({ error: "Each item needs a pathname and kind." }, { status: 400 })
      }
      if (item.pathname.includes("..")) {
        return NextResponse.json({ error: "Invalid path." }, { status: 400 })
      }
      items.push({ pathname: item.pathname, kind: item.kind })
    }

    const result = await transferItems(
      items,
      normalizePrefix(body.destinationPrefix),
      body.mode,
    )
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not transfer"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
