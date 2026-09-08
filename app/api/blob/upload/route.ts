import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/guard"
import { blobAccess, blobReadWriteToken, hasReadWriteToken } from "@/lib/blob"
import { isReservedPath } from "@/lib/paths"

export async function POST(request: Request) {
  const auth = await requireApiSession()
  if ("response" in auth) return auth.response

  if (!hasReadWriteToken()) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is required for uploads." },
      { status: 503 },
    )
  }

  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: blobReadWriteToken(),
      onBeforeGenerateToken: async (pathname) => {
        if (
          !pathname ||
          pathname.includes("..") ||
          pathname.startsWith("/") ||
          isReservedPath(pathname)
        ) {
          throw new Error("Invalid upload path")
        }

        return {
          addRandomSuffix: false,
          allowOverwrite: false,
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            pathname,
            access: blobAccess(),
          }),
        }
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
