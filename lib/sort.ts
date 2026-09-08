import type { BrowserItem } from "@/lib/types"

export type SortKey = "name" | "size" | "modified" | "type"
export type SortDir = "asc" | "desc"

export function parseSortKey(value: string | null): SortKey {
  if (value === "size" || value === "modified" || value === "type") return value
  return "name"
}

export function parseSortDir(value: string | null): SortDir {
  return value === "desc" ? "desc" : "asc"
}

export function defaultSortDir(sort: SortKey): SortDir {
  return sort === "size" || sort === "modified" ? "desc" : "asc"
}

export function nextSort(current: SortKey, dir: SortDir, next: SortKey): {
  sort: SortKey
  dir: SortDir
} {
  if (next === current) {
    return { sort: current, dir: dir === "asc" ? "desc" : "asc" }
  }
  return { sort: next, dir: defaultSortDir(next) }
}

export function sortItems(
  items: BrowserItem[],
  sort: SortKey,
  dir: SortDir,
): BrowserItem[] {
  const factor = dir === "desc" ? -1 : 1

  function byName(a: BrowserItem, b: BrowserItem) {
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  }

  function compare(a: BrowserItem, b: BrowserItem) {
    if (sort === "size") {
      return ((a.size ?? -1) - (b.size ?? -1)) * factor
    }
    if (sort === "modified") {
      const left = a.uploadedAt ? Date.parse(a.uploadedAt) : 0
      const right = b.uploadedAt ? Date.parse(b.uploadedAt) : 0
      return (left - right) * factor
    }
    if (sort === "type") {
      const byType = itemTypeLabel(a).localeCompare(itemTypeLabel(b), undefined, {
        sensitivity: "base",
      })
      if (byType !== 0) return byType * factor
      return byName(a, b)
    }
    return byName(a, b) * factor
  }

  if (sort === "type") {
    return [...items].sort(compare)
  }

  const folders = items.filter((item) => item.kind === "folder")
  const files = items.filter((item) => item.kind !== "folder")
  return [...folders.sort(compare), ...files.sort(compare)]
}

export function itemTypeLabel(item: BrowserItem): string {
  if (item.kind === "folder") return "Folder"
  switch (item.previewKind) {
    case "image":
      return "Image"
    case "video":
      return "Video"
    case "audio":
      return "Audio"
    case "pdf":
      return "PDF"
    case "text":
      return "Text"
    default:
      return "File"
  }
}
