export type PreviewKind = "image" | "video" | "audio" | "pdf" | "text" | "other"

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "bmp", "ico"])
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v"])
const AUDIO_EXT = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac"])
const TEXT_EXT = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "css",
  "html",
  "htm",
  "xml",
  "yml",
  "yaml",
  "log",
  "sh",
  "env",
  "svg",
  "toml",
  "ini",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
])

function extension(name: string): string {
  const parts = name.split(".")
  if (parts.length < 2) return ""
  return parts.at(-1)?.toLowerCase() ?? ""
}

export function previewKind(name: string, contentType?: string | null): PreviewKind {
  const ext = extension(name)
  const type = contentType ?? ""

  if (type.startsWith("image/") || IMAGE_EXT.has(ext)) return "image"
  if (type.startsWith("video/") || VIDEO_EXT.has(ext)) return "video"
  if (type.startsWith("audio/") || AUDIO_EXT.has(ext)) return "audio"
  if (type === "application/pdf" || ext === "pdf") return "pdf"
  if (type.startsWith("text/") || type.includes("json") || TEXT_EXT.has(ext)) {
    return "text"
  }
  return "other"
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || Number.isNaN(bytes)) return "—"
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  const digits = value >= 10 || index === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[index]}`
}

export function formatDate(value: string | Date | undefined): string {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}
