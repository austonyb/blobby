"use client"

import { upload } from "@vercel/blob/client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { AppHeader } from "@/components/app-header"
import { BlobbyMark } from "@/components/blobby-mark"
import { FileBreadcrumbs } from "@/components/file-browser/file-breadcrumbs"
import { FilePreview } from "@/components/file-browser/file-preview"
import { FileTable } from "@/components/file-browser/file-table"
import { FileToolbar } from "@/components/file-browser/file-toolbar"
import { OrganizeBar } from "@/components/file-browser/organize-bar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  fileApiUrl,
  isValidFolderName,
  itemShareUrl,
  joinPath,
  normalizePrefix,
  parentPrefix,
} from "@/lib/paths"
import { BLOBBY_DND, rangePaths, togglePath } from "@/lib/selection"
import {
  nextSort,
  parseSortDir,
  parseSortKey,
  sortItems,
  type SortDir,
  type SortKey,
} from "@/lib/sort"
import type { TransferItem, TransferMode, TransferResult } from "@/lib/transfer"
import type { BlobAccess, BrowserItem, ListResponse } from "@/lib/types"

type Clipboard = {
  mode: "copy" | "cut"
  items: TransferItem[]
}

function hasDragType(event: { dataTransfer: DataTransfer }, type: string) {
  return [...event.dataTransfer.types].includes(type)
}

function toTransferItems(list: BrowserItem[]): TransferItem[] {
  return list.map((item) => ({
    pathname: item.pathname,
    kind: item.kind,
    size: item.size,
  }))
}

function toastTransfer(mode: TransferMode, result: TransferResult) {
  const count = mode === "copy" ? result.copied : result.moved
  const verb = mode === "copy" ? "Copied" : "Moved"
  if (count === 0 && result.skipped > 0) {
    toast.error(result.errors[0] ?? "Nothing was transferred.")
    return
  }
  const parts = [
    count === 1 ? `${verb} 1 item` : `${verb} ${count} items`,
  ]
  if (result.keptBoth) {
    parts.push(result.keptBoth === 1 ? "kept both once" : `kept both ${result.keptBoth} times`)
  }
  if (result.skipped) {
    parts.push(result.skipped === 1 ? "skipped 1" : `skipped ${result.skipped}`)
  }
  toast.success(parts.join(", "))
}

export function FileBrowser({
  username,
  isAdmin,
}: {
  username?: string
  isAdmin?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const prefix = normalizePrefix(searchParams.get("path"))
  const fileParam = searchParams.get("file")
  const sort = parseSortKey(searchParams.get("sort"))
  const dir = parseSortDir(searchParams.get("dir"))

  const [data, setData] = useState<ListResponse | null>(null)
  const [loadedPrefix, setLoadedPrefix] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [anchorPath, setAnchorPath] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [clipboard, setClipboard] = useState<Clipboard | null>(null)
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)
  const [folderOpen, setFolderOpen] = useState(false)
  const [folderName, setFolderName] = useState("")
  const [renameItem, setRenameItem] = useState<BrowserItem | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleteItems, setDeleteItems] = useState<BrowserItem[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCount = useRef(0)
  const appliedFile = useRef<string | null>(null)

  const navigate = useCallback(
    (nextPrefix: string) => {
      const normalized = normalizePrefix(nextPrefix)
      const params = new URLSearchParams(searchParams.toString())
      if (normalized) params.set("path", normalized.replace(/\/+$/, ""))
      else params.delete("path")
      params.delete("file")
      const queryString = params.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname)
      appliedFile.current = null
      setSelectedPaths([])
      setAnchorPath(null)
      setQuery("")
    },
    [pathname, router, searchParams],
  )

  const fillFolderSizes = useCallback(async (currentPrefix: string) => {
    try {
      const response = await fetch("/api/blob/folder-sizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: currentPrefix }),
      })
      const json = (await response.json()) as {
        sizes?: Record<string, number>
        error?: string
      }
      if (!response.ok || !json.sizes) return
      setData((current) => {
        if (!current) return current
        return {
          ...current,
          uncachedFolders: [],
          items: current.items.map((item) => {
            if (item.kind !== "folder") return item
            return { ...item, size: json.sizes?.[item.pathname] ?? 0 }
          }),
        }
      })
    } catch {
      /* keep cached/empty sizes */
    }
  }, [])

  const applyList = useCallback(
    (json: ListResponse, currentPrefix: string) => {
      setData(json)
      setLoadedPrefix(currentPrefix)
      if (json.error) toast.error(json.error)
      const shareFile = new URLSearchParams(window.location.search).get("file")
      if (
        shareFile &&
        appliedFile.current !== shareFile &&
        json.items.some((item) => item.pathname === shareFile)
      ) {
        appliedFile.current = shareFile
        setSelectedPaths([shareFile])
        setAnchorPath(shareFile)
      }
      if (json.uncachedFolders?.length) void fillFolderSizes(currentPrefix)
    },
    [fillFolderSizes],
  )

  const load = useCallback(async () => {
    const currentPrefix = prefix
    try {
      const response = await fetch(
        `/api/blob/list?prefix=${encodeURIComponent(currentPrefix)}`,
      )
      const json = (await response.json()) as ListResponse
      applyList(json, currentPrefix)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load files")
      setLoadedPrefix(currentPrefix)
    }
  }, [applyList, prefix])

  useEffect(() => {
    const currentPrefix = prefix
    let cancelled = false

    fetch(`/api/blob/list?prefix=${encodeURIComponent(currentPrefix)}`)
      .then(async (response) => (await response.json()) as ListResponse)
      .then((json) => {
        if (cancelled) return
        applyList(json, currentPrefix)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : "Could not load files")
        setLoadedPrefix(currentPrefix)
      })

    return () => {
      cancelled = true
    }
  }, [applyList, prefix])

  const loading = loadedPrefix !== prefix
  const items = useMemo(() => {
    const all = data?.items ?? []
    const q = query.trim().toLowerCase()
    const filtered = q
      ? all.filter((item) => item.name.toLowerCase().includes(q))
      : all
    return sortItems(filtered, sort, dir)
  }, [data?.items, dir, query, sort])
  const selectedItems = useMemo(
    () => items.filter((item) => selectedPaths.includes(item.pathname)),
    [items, selectedPaths],
  )
  const selected = items.find((item) => item.pathname === selectedPaths.at(-1)) ?? null

  useEffect(() => {
    if (!fileParam || fileParam.endsWith("/")) return
    const parent = parentPrefix(fileParam)
    if (normalizePrefix(parent) === prefix) return
    const params = new URLSearchParams(searchParams.toString())
    if (parent) params.set("path", parent.replace(/\/+$/, ""))
    else params.delete("path")
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname)
  }, [fileParam, prefix, pathname, router, searchParams])

  const configured = data?.configured ?? false
  const access: BlobAccess = data?.access ?? "private"
  const canUpload = Boolean(data?.hasReadWriteToken)

  function targetsFor(item: BrowserItem): BrowserItem[] {
    if (selectedPaths.includes(item.pathname) && selectedItems.length > 1) {
      return selectedItems
    }
    return [item]
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!canUpload) {
      toast.error("Add BLOB_READ_WRITE_TOKEN to enable uploads.")
      return
    }

    const list = Array.from(files)
    if (list.length === 0) return

    setUploadPercent(0)
    try {
      for (const [index, file] of list.entries()) {
        const pathnameForFile = joinPath(prefix, file.name)
        await upload(pathnameForFile, file, {
          access,
          handleUploadUrl: "/api/blob/upload",
          multipart: file.size > 4 * 1024 * 1024,
          onUploadProgress: ({ percentage }) => {
            const overall = ((index + percentage / 100) / list.length) * 100
            setUploadPercent(Math.round(overall))
          },
        })
      }
      toast.success(list.length === 1 ? "Uploaded 1 file" : `Uploaded ${list.length} files`)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploadPercent(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function createFolder() {
    if (!isValidFolderName(folderName)) {
      toast.error("Enter a valid folder name.")
      return
    }
    try {
      const response = await fetch("/api/blob/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, name: folderName.trim() }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(json.error ?? "Could not create folder")
      toast.success("Folder created")
      setFolderOpen(false)
      setFolderName("")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create folder")
    }
  }

  async function confirmRename() {
    if (!renameItem) return
    try {
      const response = await fetch("/api/blob/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname: renameItem.pathname,
          name: renameValue.trim(),
          kind: renameItem.kind,
        }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(json.error ?? "Could not rename")
      toast.success("Renamed")
      setRenameItem(null)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename")
    }
  }

  async function confirmDelete() {
    if (!deleteItems?.length) return
    try {
      const response = await fetch("/api/blob/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: deleteItems.map((item) => ({
            pathname: item.pathname,
            kind: item.kind,
          })),
        }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(json.error ?? "Could not delete")
      toast.success(
        deleteItems.length === 1 ? "Deleted" : `Deleted ${deleteItems.length} items`,
      )
      setDeleteItems(null)
      setSelectedPaths([])
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete")
    }
  }

  function onOpen(item: BrowserItem) {
    if (item.kind === "folder") {
      navigate(item.pathname)
      return
    }
    setSelectedPaths([item.pathname])
    setAnchorPath(item.pathname)
  }

  function onDownload(item: BrowserItem) {
    if (item.kind !== "file") return
    window.open(fileApiUrl(item.pathname, true), "_blank", "noopener,noreferrer")
  }

  async function copyLink(item: BrowserItem) {
    try {
      await navigator.clipboard.writeText(itemShareUrl(item, window.location.origin))
      toast.success("Link copied")
    } catch {
      toast.error("Could not copy link")
    }
  }

  function onSelectItem(item: BrowserItem, event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) {
    if (selectMode || event.metaKey || event.ctrlKey) {
      setSelectedPaths((current) => togglePath(current, item.pathname))
      setAnchorPath(item.pathname)
      return
    }
    if (event.shiftKey && anchorPath) {
      setSelectedPaths(rangePaths(items, anchorPath, item.pathname))
      return
    }
    setSelectedPaths([item.pathname])
    setAnchorPath(item.pathname)
  }

  const setClipboardFrom = useCallback((list: BrowserItem[], mode: "copy" | "cut") => {
    if (list.length === 0) return
    setClipboard({ mode, items: toTransferItems(list) })
    toast.success(
      mode === "cut"
        ? list.length === 1
          ? "Ready to move 1 item"
          : `Ready to move ${list.length} items`
        : list.length === 1
          ? "Copied 1 item"
          : `Copied ${list.length} items`,
    )
  }, [])

  const runTransfer = useCallback(
    async (
      mode: TransferMode,
      transferItems: TransferItem[],
      destinationPrefix: string,
    ) => {
      if (transferItems.length === 0) return
      try {
        const response = await fetch("/api/blob/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            items: transferItems,
            destinationPrefix,
          }),
        })
        const json = (await response.json()) as TransferResult & { error?: string }
        if (!response.ok) throw new Error(json.error ?? "Could not transfer")
        toastTransfer(mode, json)
        if (mode === "move") {
          setClipboard((current) => (current?.mode === "cut" ? null : current))
          setSelectedPaths([])
        }
        await load()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not transfer")
      }
    },
    [load],
  )

  const pasteClipboard = useCallback(() => {
    if (!clipboard) return
    void runTransfer(clipboard.mode === "cut" ? "move" : "copy", clipboard.items, prefix)
  }, [clipboard, prefix, runTransfer])

  const applySort = useCallback(
    (nextSort: SortKey, nextDir: SortDir) => {
      const params = new URLSearchParams(searchParams.toString())
      if (nextSort === "name") params.delete("sort")
      else params.set("sort", nextSort)
      if (nextDir === "asc") params.delete("dir")
      else params.set("dir", nextDir)
      const queryString = params.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname)
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return

      const meta = event.metaKey || event.ctrlKey
      if (event.key === "Escape") {
        setSelectedPaths([])
        setSelectMode(false)
        return
      }
      if (meta && event.key.toLowerCase() === "a") {
        event.preventDefault()
        setSelectedPaths(items.map((item) => item.pathname))
        return
      }
      if (meta && event.key.toLowerCase() === "c") {
        event.preventDefault()
        setClipboardFrom(selectedItems, "copy")
        return
      }
      if (meta && event.key.toLowerCase() === "x") {
        event.preventDefault()
        setClipboardFrom(selectedItems, "cut")
        return
      }
      if (meta && event.key.toLowerCase() === "v") {
        event.preventDefault()
        pasteClipboard()
        return
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedItems.length > 0) {
        event.preventDefault()
        setDeleteItems(selectedItems)
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [clipboard, items, pasteClipboard, selectedItems, setClipboardFrom])

  function renderTable() {
    return (
      <FileTable
        items={items}
        selectedPaths={selectedPaths}
        selectMode={selectMode}
        cutPaths={clipboard?.mode === "cut" ? clipboard.items.map((item) => item.pathname) : []}
        dropTargetPath={dropTargetPath}
        loading={loading}
        sort={sort}
        dir={dir}
        onSort={(key) => {
          const next = nextSort(sort, dir, key)
          applySort(next.sort, next.dir)
        }}
        onSelect={onSelectItem}
        onOpen={onOpen}
        onDownload={onDownload}
        onRename={(item) => {
          setRenameItem(item)
          setRenameValue(item.name)
        }}
        onDelete={(item) => setDeleteItems(targetsFor(item))}
        onCopy={(item) => setClipboardFrom(targetsFor(item), "copy")}
        onCut={(item) => setClipboardFrom(targetsFor(item), "cut")}
        onCopyLink={copyLink}
        onDragStart={(item, event) => {
          const list = targetsFor(item)
          event.dataTransfer.setData(BLOBBY_DND, JSON.stringify(toTransferItems(list)))
          event.dataTransfer.effectAllowed = "move"
        }}
        onFolderDragOver={(item, event) => {
          if (!hasDragType(event, BLOBBY_DND)) return
          event.preventDefault()
          event.dataTransfer.dropEffect = "move"
          setDropTargetPath(item.pathname)
        }}
        onFolderDrop={(item, event) => {
          event.preventDefault()
          event.stopPropagation()
          setDropTargetPath(null)
          const raw = event.dataTransfer.getData(BLOBBY_DND)
          if (!raw) return
          try {
            const payload = JSON.parse(raw) as TransferItem[]
            void runTransfer("move", payload, item.pathname)
          } catch {
            toast.error("Could not move those items.")
          }
        }}
        onFolderDragLeave={() => setDropTargetPath(null)}
      />
    )
  }

  if (!loading && data && !configured) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-[1.75rem] border border-border bg-card p-6">
          <h1 className="text-lg font-medium">Connect Vercel Blob</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your store credentials to <code className="font-file">.env.local</code>, then restart
            the dev server.
          </p>
          <pre className="font-file mt-4 overflow-x-auto rounded-xl bg-secondary p-3 text-xs">
{`BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
BLOB_STORE_ID=store_...
BLOB_STORE_URL=https://xxxx.private.blob.vercel-storage.com`}
          </pre>
          <p className="mt-3 text-sm text-muted-foreground">
            Copy values from your Vercel Blob store. See{" "}
            <code className="font-file">env.example</code> in the project root.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      onDragEnter={(event) => {
        event.preventDefault()
        if (!hasDragType(event, "Files") || hasDragType(event, BLOBBY_DND)) return
        dragCount.current += 1
        setDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        dragCount.current = Math.max(0, dragCount.current - 1)
        if (dragCount.current === 0) setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        dragCount.current = 0
        setDragging(false)
        setDropTargetPath(null)
        const raw = event.dataTransfer.getData(BLOBBY_DND)
        if (raw) {
          try {
            const payload = JSON.parse(raw) as TransferItem[]
            void runTransfer("move", payload, prefix)
          } catch {
            toast.error("Could not move those items.")
          }
          return
        }
        void uploadFiles(event.dataTransfer.files)
      }}
    >
      <header className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 sm:px-6">
        <AppHeader username={username} isAdmin={isAdmin}>
          <FileBreadcrumbs prefix={prefix} onNavigate={navigate} />
        </AppHeader>
        <FileToolbar
          query={query}
          onQueryChange={setQuery}
          sort={sort}
          dir={dir}
          onSortChange={applySort}
          onUpload={() => fileInputRef.current?.click()}
          onNewFolder={() => setFolderOpen(true)}
          disableUpload={!canUpload && configured}
          selectMode={selectMode}
          onSelectModeChange={setSelectMode}
        />
        <OrganizeBar
          selectedCount={
            selectedItems.length > 1 || selectMode ? selectedItems.length : 0
          }
          clipboard={
            clipboard
              ? { mode: clipboard.mode, count: clipboard.items.length }
              : null
          }
          onCopy={() => setClipboardFrom(selectedItems, "copy")}
          onCut={() => setClipboardFrom(selectedItems, "cut")}
          onPaste={pasteClipboard}
          onDelete={() => setDeleteItems(selectedItems)}
          onClear={() => {
            setSelectedPaths([])
            setSelectMode(false)
          }}
        />
        {uploadPercent !== null ? (
          <Progress value={uploadPercent} className="w-full">
            <span className="sr-only">Uploading {uploadPercent}%</span>
          </Progress>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col md:hidden">
          <div className="min-h-0 flex-1 overflow-hidden">{renderTable()}</div>
          {selected && !selectMode ? (
            <div className="h-[42%] shrink-0 overflow-hidden border-t">
              <FilePreview item={selected} onCopyLink={copyLink} />
            </div>
          ) : null}
        </div>
        <div className="hidden h-full min-h-0 overflow-hidden md:block">
          <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
            <ResizablePanel defaultSize="64" minSize="40" className="min-h-0 min-w-0 overflow-hidden">
              <div className="h-full min-h-0 overflow-hidden">{renderTable()}</div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize="36" minSize="24" className="min-h-0 min-w-0 overflow-hidden">
              <div className="sticky top-0 flex h-full min-h-0 flex-col overflow-hidden">
                <FilePreview item={selected} onCopyLink={copyLink} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {dragging ? (
        <div className="drop-veil pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-primary/12">
          <div className="relative flex size-56 items-center justify-center">
            <BlobbyMark className="absolute inset-0 size-full text-primary opacity-50" />
            <p className="relative text-sm font-medium text-foreground">
              Drop to add to this folder
            </p>
          </div>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) void uploadFiles(event.target.files)
        }}
      />

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Created in the current folder.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createFolder()
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void createFolder()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameItem)} onOpenChange={(open) => !open && setRenameItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>
              {renameItem?.kind === "folder"
                ? "This renames the folder and everything inside it."
                : "Keep the file extension if you still want it."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="rename-name">Name</Label>
            <Input
              id="rename-name"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void confirmRename()
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameItem(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmRename()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteItems?.length)}
        onOpenChange={(open) => !open && setDeleteItems(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteItems?.length === 1
                ? `Delete ${deleteItems[0]?.name}?`
                : `Delete ${deleteItems?.length ?? 0} items?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItems?.some((item) => item.kind === "folder")
                ? "Folders are deleted with everything inside them. This cannot be undone."
                : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
