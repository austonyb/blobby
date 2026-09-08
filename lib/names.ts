export function uniqueBasename(desired: string, taken: Set<string>): string {
  const key = desired.toLowerCase()
  if (!taken.has(key)) return desired

  const dot = desired.lastIndexOf(".")
  const hasExt = dot > 0 && !desired.slice(dot + 1).includes("/")
  const stem = hasExt ? desired.slice(0, dot) : desired
  const ext = hasExt ? desired.slice(dot) : ""

  let n = 2
  while (taken.has(`${stem} ${n}${ext}`.toLowerCase())) n += 1
  return `${stem} ${n}${ext}`
}
