"use client"

import { Button } from "@/components/ui/button"

type ClipboardHint = {
  mode: "copy" | "cut"
  count: number
}

export function OrganizeBar({
  selectedCount,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onClear,
}: {
  selectedCount: number
  clipboard: ClipboardHint | null
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onDelete: () => void
  onClear: () => void
}) {
  if (selectedCount === 0 && !clipboard) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {selectedCount > 0 ? (
        <>
          <p className="text-muted-foreground">
            {selectedCount === 1 ? "1 selected" : `${selectedCount} selected`}
          </p>
          <Button variant="outline" size="sm" onClick={onCopy}>
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={onCut}>
            Cut
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        </>
      ) : null}
      {clipboard ? (
        <>
          <p className="text-muted-foreground">
            {clipboard.count === 1
              ? clipboard.mode === "cut"
                ? "1 item ready to move"
                : "1 item copied"
              : clipboard.mode === "cut"
                ? `${clipboard.count} items ready to move`
                : `${clipboard.count} items copied`}
          </p>
          <Button size="sm" onClick={onPaste}>
            Paste
          </Button>
        </>
      ) : null}
    </div>
  )
}
