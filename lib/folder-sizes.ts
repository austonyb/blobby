import { getJson, putJson } from "@/lib/blob"
import { FOLDER_SIZES_PATH, normalizePrefix } from "@/lib/paths"

type FolderSizesFile = {
  version: 1
  folders: Record<string, number>
}

export function containingFolders(pathname: string): string[] {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean)
  parts.pop()
  const folders: string[] = []
  for (let i = 1; i <= parts.length; i++) {
    folders.push(`${parts.slice(0, i).join("/")}/`)
  }
  return folders
}

function addDelta(
  folders: Record<string, number>,
  keys: string[],
  delta: number,
) {
  for (const key of keys) {
    if (folders[key] !== undefined) folders[key] += delta
  }
}

async function updateFolderSizes(
  mutator: (folders: Record<string, number>) => void,
): Promise<Record<string, number>> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, etag } = await getJson<FolderSizesFile>(FOLDER_SIZES_PATH)
    const folders = { ...(data?.folders ?? {}) }
    mutator(folders)
    try {
      await putJson(
        FOLDER_SIZES_PATH,
        { version: 1, folders } satisfies FolderSizesFile,
        etag,
      )
      return folders
    } catch {
      if (attempt === 3) break
    }
  }
  return {}
}

export async function readFolderSizes(): Promise<Record<string, number>> {
  const { data } = await getJson<FolderSizesFile>(FOLDER_SIZES_PATH)
  return data?.folders ?? {}
}

export async function writeComputedSizes(totals: Record<string, number>) {
  await updateFolderSizes((folders) => {
    for (const [path, size] of Object.entries(totals)) {
      folders[path] = size
    }
  })
}

export async function onFileAdded(pathname: string, size: number) {
  if (!size) return
  await updateFolderSizes((folders) => {
    addDelta(folders, containingFolders(pathname), size)
  })
}

export async function onFileRemoved(pathname: string, size?: number) {
  await updateFolderSizes((folders) => {
    const parents = containingFolders(pathname)
    if (size) addDelta(folders, parents, -size)
    else {
      for (const folder of parents) delete folders[folder]
    }
  })
}

export async function onFolderCreated(folderPath: string) {
  const prefix = normalizePrefix(folderPath)
  await updateFolderSizes((folders) => {
    if (folders[prefix] === undefined) folders[prefix] = 0
  })
}

export async function onFolderRemoved(folderPath: string) {
  const prefix = normalizePrefix(folderPath)
  await updateFolderSizes((folders) => {
    const size = folders[prefix]
    for (const key of Object.keys(folders)) {
      if (key === prefix || key.startsWith(prefix)) delete folders[key]
    }
    if (size !== undefined) addDelta(folders, containingFolders(prefix), -size)
    else {
      for (const parent of containingFolders(prefix)) delete folders[parent]
    }
  })
}

export async function onFolderMoved(fromPath: string, toPath: string) {
  const src = normalizePrefix(fromPath)
  const dest = normalizePrefix(toPath)
  if (src === dest) return

  await updateFolderSizes((folders) => {
    const size = folders[src]
    const entries = Object.entries(folders).filter(
      ([key]) => key === src || key.startsWith(src),
    )
    for (const [key, value] of entries) {
      folders[`${dest}${key.slice(src.length)}`] = value
    }
    for (const [key] of entries) delete folders[key]

    if (size !== undefined) {
      addDelta(folders, containingFolders(src), -size)
      addDelta(folders, containingFolders(dest), size)
    } else {
      for (const parent of [
        ...containingFolders(src),
        ...containingFolders(dest),
      ]) {
        delete folders[parent]
      }
    }
  })
}

export async function onFolderCopied(fromPath: string, toPath: string) {
  const src = normalizePrefix(fromPath)
  const dest = normalizePrefix(toPath)
  await updateFolderSizes((folders) => {
    const size = folders[src]
    const entries = Object.entries(folders).filter(
      ([key]) => key === src || key.startsWith(src),
    )
    for (const [key, value] of entries) {
      folders[`${dest}${key.slice(src.length)}`] = value
    }
    if (size !== undefined) addDelta(folders, containingFolders(dest), size)
    else {
      for (const parent of containingFolders(dest)) delete folders[parent]
    }
  })
}
