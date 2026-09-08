import {
  copy,
  createFolder,
  del,
  get,
  head,
  issueSignedToken,
  list,
  presignUrl,
  put,
  rename,
} from "@vercel/blob"

import { previewKind } from "@/lib/file-kind"
import {
  containingFolders,
  onFileAdded,
  onFileRemoved,
  onFolderCopied,
  onFolderCreated,
  onFolderMoved,
  onFolderRemoved,
  readFolderSizes,
  writeComputedSizes,
} from "@/lib/folder-sizes"
import { uniqueBasename } from "@/lib/names"
import {
  basename,
  isReservedPath,
  joinPath,
  normalizePrefix,
  parentPrefix,
} from "@/lib/paths"
import type { TransferItem, TransferMode, TransferResult } from "@/lib/transfer"
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
  uncachedFolders: string[]
}> {
  requireBlobConfigured()
  const prefix = normalizePrefix(prefixInput)
  if (prefix && isReservedPath(prefix)) {
    throw new Error("That path is reserved.")
  }

  const [result, cached] = await Promise.all([
    list({
      mode: "folded",
      prefix: prefix || undefined,
      limit: 1000,
      ...blobCommandOptions(),
    }),
    readFolderSizes(),
  ])

  const folders: BrowserItem[] = (result.folders ?? [])
    .map((folderPath) => {
      const pathname = folderPath.endsWith("/") ? folderPath : `${folderPath}/`
      return {
        kind: "folder" as const,
        name: basename(folderPath),
        pathname,
        size: cached[pathname],
      }
    })
    .filter((folder) => folder.name.length > 0 && !isReservedPath(folder.pathname))

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

  const uncachedFolders = folders
    .filter((folder) => folder.size === undefined)
    .map((folder) => folder.pathname)

  return { items: [...folders, ...files], hasMore: result.hasMore, uncachedFolders }
}

export async function listAllBlobs(prefix: string): Promise<{ pathname: string; size: number }[]> {
  requireBlobConfigured()
  const normalized = normalizePrefix(prefix)
  const blobs: { pathname: string; size: number }[] = []
  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const page = await list({
      prefix: normalized || undefined,
      cursor,
      limit: 1000,
      ...blobCommandOptions(),
    })
    blobs.push(
      ...page.blobs.map((blob) => ({ pathname: blob.pathname, size: blob.size })),
    )
    hasMore = page.hasMore
    cursor = page.cursor
  }

  return blobs
}

export async function blobSize(pathname: string): Promise<number | undefined> {
  try {
    return (await head(pathname, blobCommandOptions())).size
  } catch {
    return undefined
  }
}

export async function computeFolderSizes(prefixInput: string): Promise<Record<string, number>> {
  requireBlobConfigured()
  const prefix = normalizePrefix(prefixInput)
  const blobs = await listAllBlobs(prefix)
  const totals: Record<string, number> = {}
  if (prefix) totals[prefix] = 0

  for (const blob of blobs) {
    if (blob.pathname.endsWith("/")) {
      const folder = normalizePrefix(blob.pathname)
      if (totals[folder] === undefined) totals[folder] = 0
      continue
    }
    for (const folder of containingFolders(blob.pathname)) {
      if (prefix && folder !== prefix && !folder.startsWith(prefix)) continue
      totals[folder] = (totals[folder] ?? 0) + blob.size
    }
  }

  await writeComputedSizes(totals)
  return totals
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

export async function createEmptyFolder(
  pathname: string,
  options?: { updateSizes?: boolean },
) {
  requireBlobConfigured()
  assertNotReserved(pathname)
  const folderPath = pathname.endsWith("/") ? pathname : `${pathname}/`
  const created = await createFolder(folderPath, {
    access: blobAccess(),
    ...blobCommandOptions(),
  })
  if (options?.updateSizes !== false) await onFolderCreated(folderPath)
  return created
}

export async function deletePath(
  pathname: string,
  kind: "file" | "folder",
  options?: { updateSizes?: boolean },
) {
  requireBlobConfigured()
  assertNotReserved(pathname)
  if (kind === "file") {
    const size =
      options?.updateSizes !== false ? await blobSize(pathname) : undefined
    await del(pathname, blobCommandOptions())
    if (options?.updateSizes !== false) await onFileRemoved(pathname, size)
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
  if (options?.updateSizes !== false) await onFolderRemoved(prefix)
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

function writeOptions() {
  return {
    access: blobAccess(),
    addRandomSuffix: false,
    allowOverwrite: false,
    ...blobCommandOptions(),
  }
}

async function destNames(prefix: string) {
  const { items } = await listFolder(prefix)
  return new Set(items.map((item) => item.name.toLowerCase()))
}

function isFolderInsideItself(sourceFolder: string, destPrefix: string) {
  const from = normalizePrefix(sourceFolder)
  const to = normalizePrefix(destPrefix)
  return Boolean(from) && (to === from || to.startsWith(from))
}

async function copyFolderTree(fromPrefix: string, toPrefix: string) {
  const from = normalizePrefix(fromPrefix)
  const to = normalizePrefix(toPrefix)
  await createEmptyFolder(to, { updateSizes: false })
  const blobs = await listAllBlobs(from)
  blobs.sort((a, b) => a.pathname.length - b.pathname.length)

  for (const blob of blobs) {
    if (!blob.pathname.startsWith(from)) continue
    const relative = blob.pathname.slice(from.length)
    if (!relative) continue
    const dest = `${to}${relative}`
    if (blob.pathname.endsWith("/")) {
      await createEmptyFolder(dest, { updateSizes: false })
    } else {
      await copy(blob.pathname, dest, writeOptions())
    }
  }
}

async function moveFolderTree(fromPrefix: string, toPrefix: string) {
  const from = normalizePrefix(fromPrefix)
  const to = normalizePrefix(toPrefix)
  if (from === to) return
  await copyFolderTree(from, to)
  await deletePath(from, "folder", { updateSizes: false })
}

export async function renameEntry(
  pathname: string,
  kind: "file" | "folder",
  name: string,
) {
  requireBlobConfigured()
  assertNotReserved(pathname)
  const parent = parentPrefix(pathname)
  const toPathname =
    kind === "folder" ? `${joinPath(parent, name)}/` : joinPath(parent, name)

  if (kind === "folder") {
    const from = normalizePrefix(pathname)
    const to = normalizePrefix(toPathname)
    if (from === to) return { pathname: from }
    const taken = await destNames(parent)
    if (taken.has(name.toLowerCase())) {
      throw new Error("A folder with that name already exists.")
    }
    await moveFolderTree(from, to)
    await onFolderMoved(from, to)
    return { pathname: to }
  }

  const taken = await destNames(parent)
  if (
    taken.has(name.toLowerCase()) &&
    basename(pathname).toLowerCase() !== name.toLowerCase()
  ) {
    throw new Error("A file with that name already exists.")
  }
  return renamePath(pathname, toPathname)
}

export async function transferItems(
  items: TransferItem[],
  destinationPrefix: string,
  mode: TransferMode,
): Promise<TransferResult> {
  requireBlobConfigured()
  const dest = normalizePrefix(destinationPrefix)
  if (dest) assertNotReserved(dest)

  const taken = await destNames(dest)
  const result: TransferResult = {
    copied: 0,
    moved: 0,
    keptBoth: 0,
    skipped: 0,
    errors: [],
  }

  for (const item of items) {
    try {
      assertNotReserved(item.pathname)
      const name = basename(item.pathname)
      const parent = parentPrefix(item.pathname)

      if (item.kind === "folder" && isFolderInsideItself(item.pathname, dest)) {
        result.skipped += 1
        result.errors.push(`Could not ${mode} ${name} into itself.`)
        continue
      }

      if (mode === "move" && parent === dest) {
        result.skipped += 1
        continue
      }

      const unique = uniqueBasename(name, taken)
      if (unique !== name) result.keptBoth += 1
      taken.add(unique.toLowerCase())

      if (item.kind === "folder") {
        const to = `${joinPath(dest, unique)}/`
        if (mode === "copy") {
          await copyFolderTree(item.pathname, to)
          await onFolderCopied(item.pathname, to)
        } else {
          await moveFolderTree(item.pathname, to)
          await onFolderMoved(item.pathname, to)
        }
      } else {
        const to = joinPath(dest, unique)
        const size = item.size
        if (mode === "copy") {
          await copy(item.pathname, to, writeOptions())
          if (size) await onFileAdded(to, size)
        } else {
          await renamePath(item.pathname, to)
          if (size) {
            await onFileRemoved(item.pathname, size)
            await onFileAdded(to, size)
          }
        }
      }

      if (mode === "copy") result.copied += 1
      else result.moved += 1
    } catch (error) {
      result.skipped += 1
      result.errors.push(
        error instanceof Error ? error.message : `Could not ${mode} ${item.pathname}`,
      )
    }
  }

  return result
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
