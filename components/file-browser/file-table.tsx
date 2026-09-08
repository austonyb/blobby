"use client"

import type { DragEvent, MouseEvent } from "react"

import {
  ChevronDownIcon,
  ChevronUpIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FileVideoIcon,
  FolderIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { BlobbyMark } from "@/components/blobby-mark"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatBytes, formatDate } from "@/lib/file-kind"
import { itemTypeLabel, type SortDir, type SortKey } from "@/lib/sort"
import type { BrowserItem } from "@/lib/types"

type FileTableProps = {
  items: BrowserItem[]
  selectedPaths: string[]
  selectMode: boolean
  cutPaths: string[]
  dropTargetPath: string | null
  loading: boolean
  sort: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
  onSelect: (item: BrowserItem, event: MouseEvent) => void
  onOpen: (item: BrowserItem) => void
  onDownload: (item: BrowserItem) => void
  onRename: (item: BrowserItem) => void
  onDelete: (item: BrowserItem) => void
  onCopy: (item: BrowserItem) => void
  onCut: (item: BrowserItem) => void
  onCopyLink: (item: BrowserItem) => void
  onDragStart: (item: BrowserItem, event: DragEvent) => void
  onFolderDragOver: (item: BrowserItem, event: DragEvent) => void
  onFolderDrop: (item: BrowserItem, event: DragEvent) => void
  onFolderDragLeave: () => void
}

function SortHeader({
  label,
  column,
  sort,
  dir,
  onSort,
  className,
}: {
  label: string
  column: SortKey
  sort: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = sort === column
  return (
    <TableHead
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={className}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 text-left font-normal text-muted-foreground hover:text-foreground"
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUpIcon className="size-3.5" />
          ) : (
            <ChevronDownIcon className="size-3.5" />
          )
        ) : null}
      </button>
    </TableHead>
  )
}

function ItemIcon({ item }: { item: BrowserItem }) {
  if (item.kind === "folder") {
    return <FolderIcon className="size-4 text-muted-foreground" />
  }
  if (item.previewKind === "image") {
    return <FileImageIcon className="size-4 text-muted-foreground" />
  }
  if (item.previewKind === "video") {
    return <FileVideoIcon className="size-4 text-muted-foreground" />
  }
  if (item.previewKind === "text" || item.previewKind === "pdf") {
    return <FileTextIcon className="size-4 text-muted-foreground" />
  }
  return <FileIcon className="size-4 text-muted-foreground" />
}

function RowActions({
  item,
  onOpen,
  onDownload,
  onRename,
  onCopy,
  onCut,
  onCopyLink,
  onDelete,
}: {
  item: BrowserItem
  onOpen: (item: BrowserItem) => void
  onDownload: (item: BrowserItem) => void
  onRename: (item: BrowserItem) => void
  onCopy: (item: BrowserItem) => void
  onCut: (item: BrowserItem) => void
  onCopyLink: (item: BrowserItem) => void
  onDelete: (item: BrowserItem) => void
}) {
  return (
    <>
      <ContextMenuItem onClick={() => onOpen(item)}>
        {item.kind === "folder" ? "Open" : "Preview"}
      </ContextMenuItem>
      {item.kind === "file" ? (
        <ContextMenuItem onClick={() => onDownload(item)}>Download</ContextMenuItem>
      ) : null}
      <ContextMenuItem onClick={() => onCopyLink(item)}>Copy link</ContextMenuItem>
      <ContextMenuItem onClick={() => onRename(item)}>Rename</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onCopy(item)}>Copy</ContextMenuItem>
      <ContextMenuItem onClick={() => onCut(item)}>Cut</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={() => onDelete(item)}>
        Delete
      </ContextMenuItem>
    </>
  )
}

export function FileTable({
  items,
  selectedPaths,
  selectMode,
  cutPaths,
  dropTargetPath,
  loading,
  sort,
  dir,
  onSort,
  onSelect,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  onCopy,
  onCut,
  onCopyLink,
  onDragStart,
  onFolderDragOver,
  onFolderDrop,
  onFolderDragLeave,
}: FileTableProps) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-5/6" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <BlobbyMark className="size-14 text-primary opacity-40" />
        <div className="grid gap-1">
          <p className="text-sm font-medium">This folder is empty</p>
          <p className="text-sm text-muted-foreground">
            Drop files here or use Upload.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full min-h-0 overflow-hidden px-2">
      <Table className="file-inventory">
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            {selectMode ? (
              <TableHead className="w-8">
                <span className="sr-only">Selected</span>
              </TableHead>
            ) : null}
            <SortHeader
              label="Name"
              column="name"
              sort={sort}
              dir={dir}
              onSort={onSort}
              className="w-[38%] text-muted-foreground font-normal"
            />
            <SortHeader
              label="Type"
              column="type"
              sort={sort}
              dir={dir}
              onSort={onSort}
              className="w-[14%] text-muted-foreground font-normal"
            />
            <SortHeader
              label="Size"
              column="size"
              sort={sort}
              dir={dir}
              onSort={onSort}
              className="w-[16%] text-muted-foreground font-normal"
            />
            <SortHeader
              label="Modified"
              column="modified"
              sort={sort}
              dir={dir}
              onSort={onSort}
              className="w-[24%] text-muted-foreground font-normal"
            />
            <TableHead className="w-[8%]">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isSelected = selectedPaths.includes(item.pathname)
            const isCut = cutPaths.includes(item.pathname)
            const isDrop = dropTargetPath === item.pathname
            return (
              <ContextMenu key={item.pathname}>
                <ContextMenuTrigger
                  render={
                    <TableRow
                      data-state={isSelected ? "selected" : undefined}
                      draggable={!selectMode}
                      className={`file-row cursor-default border-0 hover:bg-transparent data-[state=selected]:bg-transparent${isCut ? " file-row-cut" : ""}${isDrop ? " file-row-drop" : ""}`}
                      onClick={(event) => onSelect(item, event)}
                      onDoubleClick={() => onOpen(item)}
                      onDragStart={(event) => onDragStart(item, event)}
                      onDragOver={
                        item.kind === "folder"
                          ? (event) => onFolderDragOver(item, event)
                          : undefined
                      }
                      onDragLeave={item.kind === "folder" ? onFolderDragLeave : undefined}
                      onDrop={
                        item.kind === "folder"
                          ? (event) => onFolderDrop(item, event)
                          : undefined
                      }
                    />
                  }
                >
                  {selectMode ? (
                    <TableCell className="w-8">
                      <Checkbox
                        checked={isSelected}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={() =>
                          onSelect(item, {
                            metaKey: true,
                            ctrlKey: true,
                            shiftKey: false,
                          } as MouseEvent)
                        }
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <ItemIcon item={item} />
                      <span className="font-file truncate text-[0.8125rem]">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-file text-[0.75rem] text-muted-foreground">
                    {itemTypeLabel(item)}
                  </TableCell>
                  <TableCell className="font-file text-[0.75rem] text-muted-foreground">
                    {formatBytes(item.size)}
                  </TableCell>
                  <TableCell className="font-file text-[0.75rem] text-muted-foreground">
                    {item.kind === "folder" ? "—" : formatDate(item.uploadedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        nativeButton
                        render={<Button variant="ghost" size="icon-sm" />}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontalIcon />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onOpen(item)}>
                          {item.kind === "folder" ? "Open" : "Preview"}
                        </DropdownMenuItem>
                        {item.kind === "file" ? (
                          <DropdownMenuItem onClick={() => onDownload(item)}>
                            Download
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={() => onCopyLink(item)}>
                          Copy link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRename(item)}>
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onCopy(item)}>
                          Copy
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCut(item)}>
                          Cut
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(item)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <RowActions
                    item={item}
                    onOpen={onOpen}
                    onDownload={onDownload}
                    onRename={onRename}
                    onCopy={onCopy}
                    onCut={onCut}
                    onCopyLink={onCopyLink}
                    onDelete={onDelete}
                  />
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}
