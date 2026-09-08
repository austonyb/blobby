export const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "tokyo-night", label: "Tokyo Night" },
  { value: "catppuccin", label: "Catppuccin" },
  { value: "peach", label: "Peach" },
] as const

export const THEME_VALUES = THEMES.map((theme) => theme.value)

export function sonnerAppearance(theme: string | undefined, resolved?: string) {
  if (theme === "peach" || theme === "light") return "light" as const
  if (theme === "dark" || theme === "tokyo-night" || theme === "catppuccin") {
    return "dark" as const
  }
  return resolved === "dark" ? ("dark" as const) : ("light" as const)
}
