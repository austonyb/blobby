"use client"

import { useEffect, useState, type ReactNode } from "react"
import { FileIcon } from "lucide-react"

import { BlobbyMark } from "@/components/blobby-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { formatBytes, formatDate, previewKind } from "@/lib/file-kind"
import { fileApiUrl } from "@/lib/paths"
import type { BrowserItem } from "@/lib/types"

type FilePreviewProps = {
  item: BrowserItem | null
}

const TEXT_PREVIEW_LIMIT = 512 * 1024

function PreviewWell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] border border-border bg-secondary">
        {children}
      </div>
    </div>
  )
}

export function FilePreview({ item }: FilePreviewProps) {
  if (!item) {
    return (
      <PreviewWell>
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-6 text-center">
          <BlobbyMark className="size-14 text-primary opacity-35" />
          <div className="grid gap-1">
            <p className="text-sm font-medium">No file selected</p>
            <p className="text-sm text-muted-foreground">
              Choose a file to preview it here.
            </p>
          </div>
        </div>
      </PreviewWell>
    )
  }

  if (item.kind === "folder") {
    return (
      <PreviewWell>
        <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
          <p className="font-file text-sm font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">Folder</p>
        </div>
      </PreviewWell>
    )
  }

  const kind = item.previewKind ?? previewKind(item.name)
  const src = fileApiUrl(item.pathname)

  return (
    <PreviewWell>
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-file truncate text-[0.8125rem] font-medium">{item.name}</p>
          <p className="font-file mt-0.5 text-[0.75rem] text-muted-foreground">
            {formatBytes(item.size)} · {formatDate(item.uploadedAt)}
          </p>
        </div>
        <Badge variant="outline">{kind}</Badge>
      </div>
      <div className="min-h-0 flex-1">
        <PreviewBody item={item} kind={kind} src={src} />
      </div>
      <div className="p-3">
        <Button
          variant="outline"
          className="w-full bg-card"
          nativeButton={false}
          render={<a href={fileApiUrl(item.pathname, true)} />}
        >
          Download
        </Button>
      </div>
    </PreviewWell>
  )
}

function PreviewBody({
  item,
  kind,
  src,
}: {
  item: BrowserItem
  kind: ReturnType<typeof previewKind>
  src: string
}) {
  if (kind === "image") {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={item.name}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    )
  }

  if (kind === "video") {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <SignedMedia kind="video" proxySrc={src} name={item.name} />
      </div>
    )
  }

  if (kind === "audio") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <SignedMedia kind="audio" proxySrc={src} name={item.name} />
      </div>
    )
  }

  if (kind === "pdf") {
    return (
      <iframe title={item.name} src={src} className="h-full w-full border-0" />
    )
  }

  if (kind === "text") {
    return <TextPreview key={src} src={src} size={item.size} />
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <FileIcon className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No preview for this file type.</p>
    </div>
  )
}

function SignedMedia({
  kind,
  proxySrc,
  name,
}: {
  kind: "video" | "audio"
  proxySrc: string
  name: string
}) {
  const [src, setSrc] = useState(proxySrc)

  useEffect(() => {
    let cancelled = false
    const signUrl = `${proxySrc}${proxySrc.includes("?") ? "&" : "?"}sign=1`

    fetch(signUrl)
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as { url?: string }
      })
      .then((payload) => {
        if (!cancelled && payload?.url) setSrc(payload.url)
      })
      .catch(() => {
        /* keep cookie-authenticated proxy URL */
      })

    return () => {
      cancelled = true
    }
  }, [proxySrc])

  if (kind === "video") {
    return (
      <video
        key={src}
        src={src}
        controls
        preload="metadata"
        className="max-h-full max-w-full"
      >
        <track kind="captions" />
        {name}
      </video>
    )
  }

  return (
    <audio key={src} src={src} controls preload="metadata" className="w-full">
      {name}
    </audio>
  )
}

function TextPreview({ src, size }: { src: string; size?: number }) {
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const tooLarge = Boolean(size && size > TEXT_PREVIEW_LIMIT)

  useEffect(() => {
    if (tooLarge) return

    let cancelled = false

    fetch(src)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load file")
        return response.text()
      })
      .then((value) => {
        if (!cancelled) {
          setText(value)
          setError(null)
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setText(null)
          setError(caught instanceof Error ? caught.message : "Could not load file")
        }
      })

    return () => {
      cancelled = true
    }
  }, [src, tooLarge])

  if (tooLarge || error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        {tooLarge ? "This file is too large to preview." : error}
      </div>
    )
  }

  if (text === null) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <pre className="font-file p-4 text-xs leading-5 whitespace-pre-wrap">{text}</pre>
    </ScrollArea>
  )
}
