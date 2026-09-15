export const PREVIEW_TRANSCODE_LIMIT = 80 * 1024 * 1024
const PREVIEW_MAX_WIDTH = 1280

export function canTranscodePreview(size?: number) {
  if (size === undefined) return true
  return size <= PREVIEW_TRANSCODE_LIMIT
}

function previewFailureMessage(reasons: string[]) {
  if (reasons.includes("undecodable_source_codec")) {
    return "This browser cannot decode this video (often HEVC from iPhone). Try Safari, or download the file."
  }
  if (reasons.includes("unknown_source_codec")) {
    return "This video uses a container or codec the previewer does not recognize. Download it to play."
  }
  if (reasons.includes("no_encodable_target_codec")) {
    return "This browser cannot encode a playable preview of that video. Download it to play."
  }
  return "This video could not be converted for preview in this browser. Download it to play."
}

export async function transcodePreview(
  url: string,
  options: {
    onProgress?: (progress: number) => void
    signal?: AbortSignal
  } = {},
): Promise<string> {
  const {
    ALL_FORMATS,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
    Quality,
    UrlSource,
  } = await import("mediabunny")

  if (options.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError")
  }

  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(url),
  })
  const target = new BufferTarget()
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  })

  let conversion: Awaited<ReturnType<typeof Conversion.init>> | null = null

  const abort = () => {
    void conversion?.cancel()
    input.dispose()
  }
  options.signal?.addEventListener("abort", abort, { once: true })

  try {
    const videoTrack = await input.getPrimaryVideoTrack()
    const transcodeVideo = videoTrack?.codec !== "avc"

    conversion = await Conversion.init({
      input,
      output,
      video: transcodeVideo
        ? {
            codec: "avc",
            width: PREVIEW_MAX_WIDTH,
            hardwareAcceleration: "prefer-hardware",
            quality: new Quality("medium"),
          }
        : {
            codec: "avc",
          },
      audio: {
        codec: "aac",
      },
    })

    if (!conversion.isValid) {
      const reasons = conversion.discardedTracks.map((track) => track.reason)
      throw new Error(previewFailureMessage(reasons))
    }

    conversion.onProgress = (progress) => options.onProgress?.(progress)
    await conversion.execute()

    const buffer = target.buffer
    if (!buffer) throw new Error("Conversion produced an empty file.")
    return URL.createObjectURL(new Blob([buffer], { type: "video/mp4" }))
  } finally {
    options.signal?.removeEventListener("abort", abort)
    if (!options.signal?.aborted) input.dispose()
  }
}
