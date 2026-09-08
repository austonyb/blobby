import { NextRequest, NextResponse } from "next/server"

import { requireApiSession } from "@/lib/auth/guard"
import { getBlobStream, signBlobGetUrl } from "@/lib/blob"
import { basename } from "@/lib/paths"

export const maxDuration = 60

function extraHeaders(request: NextRequest): HeadersInit | undefined {
  const headers: Record<string, string> = {}
  const range = request.headers.get("Range")
  const ifNoneMatch = request.headers.get("If-None-Match")
  if (range) headers.Range = range
  if (ifNoneMatch) headers["If-None-Match"] = ifNoneMatch
  return Object.keys(headers).length > 0 ? headers : undefined
}

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

  if (request.nextUrl.searchParams.get("sign") === "1") {
    try {
      const signed = await signBlobGetUrl(pathname)
      return NextResponse.json(signed)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign URL"
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  try {
    const result = await getBlobStream(pathname, extraHeaders(request))
    if (!result) {
      return new NextResponse("Not found", { status: 404 })
    }
    if (result.statusCode === 304 || !result.stream) {
      return new NextResponse(null, { status: result.statusCode === 304 ? 304 : 404 })
    }

    const download = request.nextUrl.searchParams.get("download") === "1"
    const headers = new Headers()
    const fromBlob = result.headers
    const contentType =
      result.blob.contentType ||
      fromBlob.get("content-type") ||
      "application/octet-stream"
    headers.set("Content-Type", contentType)
    headers.set("Accept-Ranges", "bytes")
    headers.set("Cache-Control", "private, max-age=60")

    const contentRange = fromBlob.get("content-range")
    if (contentRange) headers.set("Content-Range", contentRange)
    const contentLength =
      fromBlob.get("content-length") ??
      (result.blob.size != null ? String(result.blob.size) : null)
    if (contentLength) headers.set("Content-Length", contentLength)
    const etag = fromBlob.get("etag") ?? result.blob.etag
    if (etag) headers.set("ETag", etag)

    const filename = basename(pathname)
    headers.set(
      "Content-Disposition",
      download
        ? `attachment; filename="${filename.replaceAll('"', "")}"`
        : `inline; filename="${filename.replaceAll('"', "")}"`,
    )

    return new NextResponse(result.stream, {
      status: result.headers.get("content-range") ? 206 : 200,
      headers,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read file"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ pathname: string[] }> },
) {
  const response = await GET(request, context)
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  })
}
