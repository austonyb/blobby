"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { FileIcon, FolderIcon } from "lucide-react"

import { BlobbyMark } from "@/components/blobby-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { formatBytes, formatDate, previewKind } from "@/lib/file-kind"
import { fileApiUrl } from "@/lib/paths"
import { canTranscodePreview, transcodePreview } from "@/lib/transcode-preview"
import type { BrowserItem, ListResponse } from "@/lib/types"

type FilePreviewProps = {
  item: BrowserItem | null
  onCopyLink?: (item: BrowserItem) => void
  onOpenFolder?: (item: BrowserItem) => void
}

const TEXT_PREVIEW_LIMIT = 512 * 1024

function PreviewShell({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col">{children}</div>
}

export function FilePreview({ item, onCopyLink, onOpenFolder }: FilePreviewProps) {
  if (!item) {
    return (
      <PreviewShell>
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-6 text-center">
          <BlobbyMark className="size-14 text-primary opacity-35" />
          <div className="grid gap-1">
            <p className="text-sm font-medium">No file selected</p>
            <p className="text-sm text-muted-foreground">
              Choose a file to preview it here.
            </p>
          </div>
        </div>
      </PreviewShell>
    )
  }

  if (item.kind === "folder") {
    return (
      <PreviewShell>
        <FolderPreview key={item.pathname} item={item} onOpen={onOpenFolder} />
      </PreviewShell>
    )
  }

  const kind = item.previewKind ?? previewKind(item.name)
  const src = fileApiUrl(item.pathname)

  return (
    <PreviewShell>
      <div className="flex shrink-0 items-start justify-between gap-3 px-4 py-3">
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
      <div className="grid shrink-0 gap-2 border-t border-border p-3">
        {onCopyLink ? (
          <Button variant="outline" className="w-full bg-card" onClick={() => onCopyLink(item)}>
            Copy link
          </Button>
        ) : null}
        <Button
          variant="outline"
          className="w-full bg-card"
          nativeButton={false}
          render={<a href={fileApiUrl(item.pathname, true)} />}
        >
          Download
        </Button>
      </div>
    </PreviewShell>
  )
}

function FolderPreview({
  item,
  onOpen,
}: {
  item: BrowserItem
  onOpen?: (item: BrowserItem) => void
}) {
  const [count, setCount] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/blob/list?prefix=${encodeURIComponent(item.pathname)}`)
      .then(async (response) => (await response.json()) as ListResponse)
      .then((json) => {
        if (cancelled) return
        setCount(json.items?.length ?? 0)
        setHasMore(Boolean(json.hasMore))
      })
      .catch(() => {
        if (!cancelled) setCount(null)
      })

    return () => {
      cancelled = true
    }
  }, [item.pathname])

  const itemLabel =
    count === null
      ? null
      : hasMore
        ? `${count}+ items`
        : count === 1
          ? "1 item"
          : `${count} items`

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <FolderIcon className="size-10 text-muted-foreground" />
      <div className="grid gap-1">
        <p className="font-file text-sm font-medium">{item.name}</p>
        {itemLabel ? (
          <p className="text-sm text-muted-foreground">{itemLabel}</p>
        ) : (
          <Skeleton className="mx-auto h-4 w-20" />
        )}
        {item.size !== undefined ? (
          <p className="text-sm text-muted-foreground">{formatBytes(item.size)}</p>
        ) : null}
      </div>
      {onOpen ? (
        <Button onClick={() => onOpen(item)}>Open folder</Button>
      ) : null}
    </div>
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
    return <ImagePreview key={src} src={src} name={item.name} />
  }

  if (kind === "video") {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <SignedMedia key={src} kind="video" proxySrc={src} name={item.name} size={item.size} />
      </div>
    )
  }

  if (kind === "audio") {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <SignedMedia key={src} kind="audio" proxySrc={src} name={item.name} />
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

function ImagePreview({ src, name }: { src: string; name: string }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="relative flex h-full items-center justify-center bg-muted/30 p-4" aria-busy={!ready && !error}>
      {!ready && !error ? (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <Skeleton className="h-[min(16rem,70%)] w-[min(20rem,80%)]" />
        </div>
      ) : null}
      {error ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{error}</p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          onLoad={() => setReady(true)}
          onError={() => setError("This image could not be previewed.")}
          className={`max-h-full max-w-full object-contain transition-opacity ${ready ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  )
}

function SignedMedia({
  kind,
  proxySrc,
  name,
  size,
}: {
  kind: "video" | "audio"
  proxySrc: string
  name: string
  size?: number
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [stage, setStage] = useState<"signed" | "proxy" | "transcoded">("signed")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const blobUrlRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const stageRef = useRef<"signed" | "proxy" | "transcoded">("signed")

  useEffect(() => {
    stageRef.current = stage
  }, [stage])

  useEffect(() => {
    let cancelled = false
    const signUrl = `${proxySrc}${proxySrc.includes("?") ? "&" : "?"}sign=1`

    fetch(signUrl)
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as { url?: string }
      })
      .then((payload) => {
        if (!cancelled) setSrc(payload?.url ?? proxySrc)
      })
      .catch(() => {
        if (!cancelled) setSrc(proxySrc)
      })

    return () => {
      cancelled = true
      abortRef.current?.abort()
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [proxySrc])

  async function recoverFromError() {
    if (stageRef.current === "signed") {
      setReady(false)
      setStage("proxy")
      setSrc(proxySrc)
      return
    }

    if (kind === "video" && stageRef.current === "proxy") {
      if (!canTranscodePreview(size)) {
        setError("This video is too large to convert in the browser. Download it to play.")
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setConverting(true)
      setProgress(0)

      try {
        const blobUrl = await transcodePreview(proxySrc, {
          onProgress: setProgress,
          signal: controller.signal,
        })
        if (controller.signal.aborted) {
          URL.revokeObjectURL(blobUrl)
          return
        }
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = blobUrl
        setStage("transcoded")
        setReady(false)
        setSrc(blobUrl)
        setConverting(false)
      } catch (caught) {
        if (controller.signal.aborted) return
        if (caught instanceof Error && caught.name === "ConversionCanceledError") return
        setConverting(false)
        setError(
          caught instanceof Error
            ? caught.message
            : "This video could not be previewed in this browser. Download it to play.",
        )
      }
      return
    }

    setError(
      kind === "video"
        ? "This video could not be previewed in this browser. Download it to play."
        : "This audio could not be previewed.",
    )
  }

  const loading = Boolean(src) && !ready && !error && !converting
  const waiting = !src && !error && !converting

  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      aria-busy={waiting || loading || converting}
    >
      {waiting || loading || converting ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          <Skeleton className={kind === "video" ? "h-40 w-full max-w-sm" : "h-10 w-full max-w-sm"} />
          {converting ? (
            <div className="w-full max-w-sm">
              <p className="mb-2 text-center text-sm text-muted-foreground">
                Preparing a playable preview…
              </p>
              <Progress value={Math.round(progress * 100)}>
                <span className="sr-only">
                  Converting {Math.round(progress * 100)}%
                </span>
              </Progress>
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{error}</p>
      ) : null}
      {src && !error && !converting ? (
        kind === "video" ? (
          <video
            key={src}
            src={src}
            controls={ready}
            preload="metadata"
            onLoadedMetadata={() => setReady(true)}
            onError={() => void recoverFromError()}
            className={`max-h-full max-w-full transition-opacity ${ready ? "opacity-100" : "opacity-0"}`}
          >
            <track kind="captions" />
            {name}
          </video>
        ) : (
          <audio
            key={src}
            src={src}
            controls={ready}
            preload="metadata"
            onLoadedMetadata={() => setReady(true)}
            onError={() => void recoverFromError()}
            className={`w-full transition-opacity ${ready ? "opacity-100" : "opacity-0"}`}
          >
            {name}
          </audio>
        )
      ) : null}
    </div>
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
