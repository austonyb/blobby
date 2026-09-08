"use client"

import { ArrowDownAZIcon, ArrowUpZAIcon, FolderPlusIcon, UploadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { SortDir, SortKey } from "@/lib/sort"

type FileToolbarProps = {
  query: string
  onQueryChange: (value: string) => void
  sort: SortKey
  dir: SortDir
  onSortChange: (sort: SortKey, dir: SortDir) => void
  onUpload: () => void
  onNewFolder: () => void
  disableUpload?: boolean
  selectMode: boolean
  onSelectModeChange: (value: boolean) => void
}

const SORT_LABEL: Record<SortKey, string> = {
  name: "Name",
  type: "Type",
  size: "Size",
  modified: "Date",
}

export function FileToolbar({
  query,
  onQueryChange,
  sort,
  dir,
  onSortChange,
  onUpload,
  onNewFolder,
  disableUpload,
  selectMode,
  onSelectModeChange,
}: FileToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search this folder"
        className="w-full bg-card sm:max-w-md"
      />
      <div className="flex items-center gap-2 sm:ml-auto">
        <Button
          variant={selectMode ? "secondary" : "outline"}
          className="md:hidden"
          onClick={() => onSelectModeChange(!selectMode)}
        >
          {selectMode ? "Done" : "Select"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger nativeButton render={<Button variant="outline" />}>
            {dir === "desc" ? (
              <ArrowUpZAIcon data-icon="inline-start" />
            ) : (
              <ArrowDownAZIcon data-icon="inline-start" />
            )}
            {SORT_LABEL[sort]}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40 w-max">
            <DropdownMenuRadioGroup
              value={`${sort}:${dir}`}
              onValueChange={(value) => {
                const [nextSort, nextDir] = value.split(":") as [SortKey, SortDir]
                onSortChange(nextSort, nextDir)
              }}
            >
              <DropdownMenuRadioItem value="name:asc">Name A–Z</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name:desc">Name Z–A</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="type:asc">Type A–Z</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="type:desc">Type Z–A</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="modified:desc">Newest</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="modified:asc">Oldest</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="size:desc">Largest</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="size:asc">Smallest</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
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
