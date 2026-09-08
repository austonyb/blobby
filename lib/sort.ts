import type { BrowserItem } from "@/lib/types"

export type SortKey = "name" | "size" | "modified"
export type SortDir = "asc" | "desc"

export function parseSortKey(value: string | null): SortKey {
  if (value === "size" || value === "modified") return value
  return "name"
}

export function parseSortDir(value: string | null): SortDir {
  return value === "desc" ? "desc" : "asc"
}

export function sortItems(
  items: BrowserItem[],
  sort: SortKey,
  dir: SortDir,
): BrowserItem[] {
  const folders = items.filter((item) => item.kind === "folder")
  const files = items.filter((item) => item.kind !== "folder")
  const factor = dir === "desc" ? -1 : 1

  function compare(a: BrowserItem, b: BrowserItem) {
    if (sort === "size") {
      return ((a.size ?? -1) - (b.size ?? -1)) * factor
    }
    if (sort === "modified") {
      const left = a.uploadedAt ? Date.parse(a.uploadedAt) : 0
      const right = b.uploadedAt ? Date.parse(b.uploadedAt) : 0
      return (left - right) * factor
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * factor
  }

  return [...folders.sort(compare), ...files.sort(compare)]
}
