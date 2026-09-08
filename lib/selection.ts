import type { BrowserItem } from "@/lib/types"

export function togglePath(paths: string[], path: string): string[] {
  return paths.includes(path) ? paths.filter((item) => item !== path) : [...paths, path]
}

export function rangePaths(
  items: BrowserItem[],
  fromPath: string,
  toPath: string,
): string[] {
  const from = items.findIndex((item) => item.pathname === fromPath)
  const to = items.findIndex((item) => item.pathname === toPath)
  if (from < 0 || to < 0) return [toPath]
  const start = Math.min(from, to)
  const end = Math.max(from, to)
  return items.slice(start, end + 1).map((item) => item.pathname)
}

export const BLOBBY_DND = "application/x-blobby-items"
