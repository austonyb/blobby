import { NextRequest, NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/guard"
import {
  blobAccess,
  hasReadWriteToken,
  isBlobConfigured,
  listFolder,
} from "@/lib/blob"
import { normalizePrefix } from "@/lib/paths"
import type { ListResponse } from "@/lib/types"

export async function GET(request: NextRequest) {
  const auth = await requireApiSession()
  if ("response" in auth) return auth.response

  const prefix = normalizePrefix(request.nextUrl.searchParams.get("prefix"))

  if (!isBlobConfigured()) {
    const body: ListResponse = {
      configured: false,
      hasReadWriteToken: false,
      access: blobAccess(),
      prefix,
      items: [],
      hasMore: false,
    }
    return NextResponse.json(body)
  }

  try {
    const { items, hasMore } = await listFolder(prefix)
    const body: ListResponse = {
      configured: true,
      hasReadWriteToken: hasReadWriteToken(),
      access: blobAccess(),
      prefix,
      items,
      hasMore,
    }
    return NextResponse.json(body)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list files"
    return NextResponse.json(
      {
        configured: true,
        hasReadWriteToken: hasReadWriteToken(),
        access: blobAccess(),
        prefix,
        items: [],
        hasMore: false,
        error: message,
      } satisfies ListResponse,
      { status: 500 },
    )
  }
}
