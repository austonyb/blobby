"use client"

import {
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  FileVideoIcon,
  FolderIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { BlobbyMark } from "@/components/blobby-mark"
import { Button } from "@/components/ui/button"
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
import type { BrowserItem } from "@/lib/types"

type FileTableProps = {
  items: BrowserItem[]
  selected: BrowserItem | null
  loading: boolean
  onSelect: (item: BrowserItem) => void
  onOpen: (item: BrowserItem) => void
  onDownload: (item: BrowserItem) => void
  onRename: (item: BrowserItem) => void
  onDelete: (item: BrowserItem) => void
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
  onDelete,
}: {
  item: BrowserItem
  onOpen: (item: BrowserItem) => void
  onDownload: (item: BrowserItem) => void
  onRename: (item: BrowserItem) => void
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
      {item.kind === "file" ? (
        <ContextMenuItem onClick={() => onRename(item)}>Rename</ContextMenuItem>
      ) : null}
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={() => onDelete(item)}>
        Delete
      </ContextMenuItem>
    </>
  )
}

export function FileTable({
  items,
  selected,
  loading,
  onSelect,
  onOpen,
  onDownload,
  onRename,
  onDelete,
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
            <TableHead className="w-[48%] text-muted-foreground font-normal">Name</TableHead>
            <TableHead className="w-[18%] text-muted-foreground font-normal">Size</TableHead>
            <TableHead className="w-[26%] text-muted-foreground font-normal">Modified</TableHead>
            <TableHead className="w-[8%]">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isSelected = selected?.pathname === item.pathname
            return (
              <ContextMenu key={item.pathname}>
                <ContextMenuTrigger
                  render={
                    <TableRow
                      data-state={isSelected ? "selected" : undefined}
                      className="file-row cursor-default border-0 hover:bg-transparent data-[state=selected]:bg-transparent"
                      onClick={() => onSelect(item)}
                      onDoubleClick={() => onOpen(item)}
                    />
                  }
                >
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <ItemIcon item={item} />
                      <span className="font-file truncate text-[0.8125rem]">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-file text-[0.75rem] text-muted-foreground">
                    {item.kind === "folder" ? "—" : formatBytes(item.size)}
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
                        {item.kind === "file" ? (
                          <DropdownMenuItem onClick={() => onRename(item)}>
                            Rename
                          </DropdownMenuItem>
                        ) : null}
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
