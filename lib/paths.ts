export function normalizePrefix(path: string | null | undefined): string {
  const clean = (path ?? "")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
    .join("/")
  return clean ? `${clean}/` : ""
}

export function joinPath(prefix: string, name: string): string {
  const base = normalizePrefix(prefix)
  const safeName = name.replaceAll("\\", "/").split("/").filter(Boolean).join("/")
  if (!safeName || safeName.includes("..")) {
    throw new Error("Invalid name")
  }
  return `${base}${safeName}`
}

export function basename(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "")
  const parts = trimmed.split("/").filter(Boolean)
  return parts.at(-1) ?? trimmed
}

export function parentPrefix(prefix: string): string {
  const parts = normalizePrefix(prefix)
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)
  parts.pop()
  return parts.length ? `${parts.join("/")}/` : ""
}

export const CONFIG_PREFIX = ".config/"
export const USERS_PATH = ".config/auth/users.json"
export const INVITES_PATH = ".config/auth/invites.json"
export const FOLDER_SIZES_PATH = ".config/folder-sizes.json"

export function isReservedPath(pathname: string): boolean {
  const normalized = pathname.replace(/^\/+/, "").replace(/\/+$/, "")
  return normalized === ".config" || normalized.startsWith(".config/")
}

export function isValidFolderName(name: string): boolean {
  const trimmed = name.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= 128 &&
    !trimmed.includes("/") &&
    !trimmed.includes("\\") &&
    trimmed !== "." &&
    trimmed !== ".." &&
    trimmed !== ".config"
  )
}

export function isValidFileName(name: string): boolean {
  return isValidFolderName(name)
}

export function itemShareUrl(
  item: { kind: "folder" | "file"; pathname: string },
  origin = "",
): string {
  const params = new URLSearchParams()
  if (item.kind === "folder") {
    const path = item.pathname.replace(/\/+$/, "")
    if (path) params.set("path", path)
  } else {
    const parent = parentPrefix(item.pathname).replace(/\/+$/, "")
    if (parent) params.set("path", parent)
    params.set("file", item.pathname)
  }
  const query = params.toString()
  const base = origin || ""
  return `${base}/${query ? `?${query}` : ""}`
}

export function fileApiUrl(
  pathname: string,
  options: boolean | { download?: boolean; sign?: boolean } = {},
): string {
  const opts = typeof options === "boolean" ? { download: options } : options
  const encoded = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  const params = new URLSearchParams()
  if (opts.download) params.set("download", "1")
  if (opts.sign) params.set("sign", "1")
  const query = params.toString()
  return `/api/blob/file/${encoded}${query ? `?${query}` : ""}`
}
