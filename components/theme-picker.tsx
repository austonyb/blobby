"use client"

import { useTheme } from "next-themes"

import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { THEMES } from "@/lib/themes"

export function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenuRadioGroup
      value={theme ?? "system"}
      onValueChange={setTheme}
    >
      {THEMES.map((item) => (
        <DropdownMenuRadioItem key={item.value} value={item.value}>
          {item.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}
