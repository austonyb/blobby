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
import { fileApiUrl, isValidFolderName, joinPath, normalizePrefix } from "@/lib/paths"
import { parseSortDir, parseSortKey, sortItems } from "@/lib/sort"
import type { BlobAccess, BrowserItem, ListResponse } from "@/lib/types"

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
  const sort = parseSortKey(searchParams.get("sort"))
  const dir = parseSortDir(searchParams.get("dir"))

  const [data, setData] = useState<ListResponse | null>(null)
  const [loadedPrefix, setLoadedPrefix] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)
  const [folderOpen, setFolderOpen] = useState(false)
  const [folderName, setFolderName] = useState("")
  const [renameItem, setRenameItem] = useState<BrowserItem | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleteItem, setDeleteItem] = useState<BrowserItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCount = useRef(0)

  const navigate = useCallback(
    (nextPrefix: string) => {
      const normalized = normalizePrefix(nextPrefix)
      const params = new URLSearchParams(searchParams.toString())
      if (normalized) params.set("path", normalized.replace(/\/+$/, ""))
      else params.delete("path")
      const queryString = params.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname)
      setSelectedPath(null)
      setQuery("")
    },
    [pathname, router, searchParams],
  )

  const load = useCallback(async () => {
    const currentPrefix = prefix
    try {
      const response = await fetch(
        `/api/blob/list?prefix=${encodeURIComponent(currentPrefix)}`,
      )
      const json = (await response.json()) as ListResponse
      setData(json)
      setLoadedPrefix(currentPrefix)
      if (json.error) toast.error(json.error)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load files")
      setLoadedPrefix(currentPrefix)
    }
  }, [prefix])

  useEffect(() => {
    const currentPrefix = prefix
    let cancelled = false

    fetch(`/api/blob/list?prefix=${encodeURIComponent(currentPrefix)}`)
      .then(async (response) => (await response.json()) as ListResponse)
      .then((json) => {
        if (cancelled) return
        setData(json)
        setLoadedPrefix(currentPrefix)
        if (json.error) toast.error(json.error)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : "Could not load files")
        setLoadedPrefix(currentPrefix)
      })

    return () => {
      cancelled = true
    }
  }, [prefix])

  const loading = loadedPrefix !== prefix
  const items = useMemo(() => {
    const all = data?.items ?? []
    const q = query.trim().toLowerCase()
    const filtered = q
      ? all.filter((item) => item.name.toLowerCase().includes(q))
      : all
    return sortItems(filtered, sort, dir)
  }, [data?.items, dir, query, sort])
  const selected = items.find((item) => item.pathname === selectedPath) ?? null

  const configured = data?.configured ?? false
  const access: BlobAccess = data?.access ?? "private"
  const canUpload = Boolean(data?.hasReadWriteToken)

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
        body: JSON.stringify({ pathname: renameItem.pathname, name: renameValue.trim() }),
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
    if (!deleteItem) return
    try {
      const response = await fetch("/api/blob/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname: deleteItem.pathname, kind: deleteItem.kind }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(json.error ?? "Could not delete")
      toast.success("Deleted")
      setDeleteItem(null)
      setSelectedPath(null)
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
    setSelectedPath(item.pathname)
  }

  function onDownload(item: BrowserItem) {
    if (item.kind !== "file") return
    window.open(fileApiUrl(item.pathname, true), "_blank", "noopener,noreferrer")
  }

  function renderTable() {
    return (
      <FileTable
        items={items}
        selected={selected}
        loading={loading}
        onSelect={(item) => setSelectedPath(item.pathname)}
        onOpen={onOpen}
        onDownload={onDownload}
        onRename={(item) => {
          setRenameItem(item)
          setRenameValue(item.name)
        }}
        onDelete={setDeleteItem}
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
          onSortChange={(nextSort, nextDir) => {
            const params = new URLSearchParams(searchParams.toString())
            if (nextSort === "name") params.delete("sort")
            else params.set("sort", nextSort)
            if (nextDir === "asc") params.delete("dir")
            else params.set("dir", nextDir)
            const queryString = params.toString()
            router.replace(queryString ? `${pathname}?${queryString}` : pathname)
          }}
          onUpload={() => fileInputRef.current?.click()}
          onNewFolder={() => setFolderOpen(true)}
          disableUpload={!canUpload && configured}
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
          {selected ? (
            <div className="h-[42%] shrink-0 overflow-hidden border-t">
              <FilePreview item={selected} />
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
                <FilePreview item={selected} />
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
            <DialogDescription>Keep the file extension if you still want it.</DialogDescription>
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
        open={Boolean(deleteItem)}
        onOpenChange={(open) => !open && setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteItem?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem?.kind === "folder"
                ? "This deletes the folder and everything inside it."
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
