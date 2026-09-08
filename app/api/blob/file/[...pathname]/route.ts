import { NextRequest, NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/guard"
import { getBlobStream } from "@/lib/blob"
import { basename } from "@/lib/paths"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pathname: string[] }> },
) {
  const auth = await requireApiSession()
  if ("response" in auth) return auth.response

  const { pathname: segments } = await params
  const pathname = segments.map((part) => decodeURIComponent(part)).join("/")

  if (!pathname || pathname.includes("..")) {
    return new NextResponse("Not found", { status: 404 })
  }

  try {
    const result = await getBlobStream(pathname)
    if (!result || result.statusCode !== 200 || !result.stream) {
      return new NextResponse("Not found", { status: 404 })
    }

    const download = request.nextUrl.searchParams.get("download") === "1"
    const headers = new Headers()
    headers.set("Content-Type", result.blob.contentType || "application/octet-stream")
    if (result.blob.size != null) {
      headers.set("Content-Length", String(result.blob.size))
    }
    headers.set("Cache-Control", "private, max-age=60")

    const filename = basename(pathname)
    headers.set(
      "Content-Disposition",
      download
        ? `attachment; filename="${filename.replaceAll('"', "")}"`
        : `inline; filename="${filename.replaceAll('"', "")}"`,
    )

    return new NextResponse(result.stream, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read file"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
