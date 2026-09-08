import type { PreviewKind } from "@/lib/file-kind"

export type BlobAccess = "private" | "public"

export type BrowserItem = {
  kind: "folder" | "file"
  name: string
  pathname: string
  url?: string
  downloadUrl?: string
  size?: number
  uploadedAt?: string
  previewKind?: PreviewKind
}

export type ListResponse = {
  configured: boolean
  hasReadWriteToken: boolean
  access: BlobAccess
  prefix: string
  items: BrowserItem[]
  hasMore: boolean
  error?: string
}
