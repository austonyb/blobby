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

export function fileApiUrl(pathname: string, download = false): string {
  const encoded = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `/api/blob/file/${encoded}${download ? "?download=1" : ""}`
}
