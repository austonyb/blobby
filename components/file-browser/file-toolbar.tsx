"use client"

import { FolderPlusIcon, UploadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type FileToolbarProps = {
  query: string
  onQueryChange: (value: string) => void
  onUpload: () => void
  onNewFolder: () => void
  disableUpload?: boolean
}

export function FileToolbar({
  query,
  onQueryChange,
  onUpload,
  onNewFolder,
  disableUpload,
}: FileToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search this folder"
        className="w-full sm:max-w-xs"
      />
      <div className="flex items-center gap-2 sm:ml-auto">
        <Button variant="outline" onClick={onNewFolder}>
          <FolderPlusIcon data-icon="inline-start" />
          New folder
        </Button>
        <Button onClick={onUpload} disabled={disableUpload}>
          <UploadIcon data-icon="inline-start" />
          Upload
        </Button>
      </div>
    </div>
  )
}
