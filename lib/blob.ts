import {
  createFolder,
  del,
  get,
  issueSignedToken,
  list,
  presignUrl,
  put,
  rename,
} from "@vercel/blob"

import { previewKind } from "@/lib/file-kind"
import { basename, isReservedPath, normalizePrefix } from "@/lib/paths"
import type { BlobAccess, BrowserItem } from "@/lib/types"

export function blobAccess(): BlobAccess {
  // Store is private and cannot be changed after creation.
  return "private"
}

export function blobStoreId(): string | undefined {
  const value = process.env.BLOB_STORE_ID?.trim()
  return value ? value : undefined
}

export function blobStoreUrl(): string | undefined {
  const value =
    process.env.BLOB_STORE_URL?.trim() || process.env.BLOB_URL?.trim()
  return value ? value.replace(/\/+$/, "") : undefined
}

function blobCommandOptions() {
  // An explicit token always beats OIDC. Needed when the store lives on a
  // different Vercel account than this deployment: Vercel injects
  // VERCEL_OIDC_TOKEN, and pairing it with BLOB_STORE_ID 403s.
  const token = blobReadWriteToken()
  const storeId = blobStoreId()
  return {
    ...(token ? { token } : {}),
    ...(storeId ? { storeId } : {}),
  }
}

export function blobReadWriteToken(): string | undefined {
  const value = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  return value ? value : undefined
}

export function hasReadWriteToken(): boolean {
  return Boolean(blobReadWriteToken())
}

export function isBlobConfigured(): boolean {
  if (hasReadWriteToken()) return true
  return Boolean(process.env.VERCEL_OIDC_TOKEN && blobStoreId())
}

export function requireBlobConfigured(): void {
  if (!isBlobConfigured()) {
    throw new Error(
      "Vercel Blob is not configured. Add BLOB_READ_WRITE_TOKEN to .env.local.",
    )
  }
}

export function assertNotReserved(pathname: string): void {
  if (isReservedPath(pathname)) {
    throw new Error("That path is reserved.")
  }
}

export async function listFolder(prefixInput: string): Promise<{
  items: BrowserItem[]
  hasMore: boolean
}> {
  requireBlobConfigured()
  const prefix = normalizePrefix(prefixInput)
  if (prefix && isReservedPath(prefix)) {
    throw new Error("That path is reserved.")
  }
  const result = await list({
    mode: "folded",
    prefix: prefix || undefined,
    limit: 1000,
    ...blobCommandOptions(),
  })

  const folders: BrowserItem[] = (result.folders ?? [])
    .map((folderPath) => ({
      kind: "folder" as const,
      name: basename(folderPath),
      pathname: folderPath.endsWith("/") ? folderPath : `${folderPath}/`,
    }))
    .filter((folder) => folder.name.length > 0 && !isReservedPath(folder.pathname))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))

  const files: BrowserItem[] = result.blobs
    .filter((blob) => !blob.pathname.endsWith("/") && !isReservedPath(blob.pathname))
    .map((blob) => ({
      kind: "file" as const,
      name: basename(blob.pathname),
      pathname: blob.pathname,
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      size: blob.size,
      uploadedAt: blob.uploadedAt.toISOString(),
      previewKind: previewKind(blob.pathname),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))

  return { items: [...folders, ...files], hasMore: result.hasMore }
}

export async function getJson<T>(pathname: string): Promise<{
  data: T | null
  etag?: string
}> {
  requireBlobConfigured()
  const result = await get(pathname, {
    access: blobAccess(),
    useCache: false,
    ...blobCommandOptions(),
  })
  if (!result || result.statusCode !== 200 || !result.stream) {
    return { data: null }
  }
  const text = await new Response(result.stream).text()
  if (!text.trim()) {
    return { data: null, etag: result.blob.etag }
  }
  return { data: JSON.parse(text) as T, etag: result.blob.etag }
}

export async function putJson(pathname: string, data: unknown, etag?: string) {
  requireBlobConfigured()
  return put(pathname, JSON.stringify(data, null, 2), {
    access: blobAccess(),
    addRandomSuffix: false,
    allowOverwrite: Boolean(etag),
    contentType: "application/json",
    cacheControlMaxAge: 60,
    ifMatch: etag,
    ...blobCommandOptions(),
  })
}

export async function createEmptyFolder(pathname: string) {
  requireBlobConfigured()
  assertNotReserved(pathname)
  const folderPath = pathname.endsWith("/") ? pathname : `${pathname}/`
  return createFolder(folderPath, { access: blobAccess(), ...blobCommandOptions() })
}

export async function deletePath(pathname: string, kind: "file" | "folder") {
  requireBlobConfigured()
  assertNotReserved(pathname)
  if (kind === "file") {
    await del(pathname, blobCommandOptions())
    return
  }

  const prefix = pathname.endsWith("/") ? pathname : `${pathname}/`
  const urls: string[] = []
  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const page = await list({ prefix, cursor, limit: 1000, ...blobCommandOptions() })
    urls.push(...page.blobs.map((blob) => blob.url))
    hasMore = page.hasMore
    cursor = page.cursor
  }

  if (urls.length > 0) {
    await del(urls, blobCommandOptions())
  }
  await del(prefix, blobCommandOptions())
}

export async function renamePath(fromPathname: string, toPathname: string) {
  requireBlobConfigured()
  assertNotReserved(fromPathname)
  assertNotReserved(toPathname)
  return rename(fromPathname, toPathname, {
    access: blobAccess(),
    ...blobCommandOptions(),
  })
}

export async function getBlobStream(
  pathname: string,
  extraHeaders?: HeadersInit,
) {
  requireBlobConfigured()
  assertNotReserved(pathname)
  return get(pathname, {
    access: blobAccess(),
    headers: extraHeaders,
    ...blobCommandOptions(),
  })
}

export async function signBlobGetUrl(pathname: string): Promise<{
  url: string
  expiresAt: number
}> {
  requireBlobConfigured()
  assertNotReserved(pathname)
  const expiresAt = Date.now() + 15 * 60 * 1000
  const token = await issueSignedToken({
    pathname,
    operations: ["get"],
    validUntil: Date.now() + 60 * 60 * 1000,
    ...blobCommandOptions(),
  })
  const { presignedUrl } = await presignUrl(token, {
    operation: "get",
    pathname,
    access: blobAccess(),
    validUntil: expiresAt,
  })
  return { url: presignedUrl, expiresAt }
}
