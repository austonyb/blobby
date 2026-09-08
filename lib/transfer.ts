export type TransferItem = {
  pathname: string
  kind: "file" | "folder"
  size?: number
}

export type TransferMode = "copy" | "move"

export type TransferResult = {
  copied: number
  moved: number
  keptBoth: number
  skipped: number
  errors: string[]
}
