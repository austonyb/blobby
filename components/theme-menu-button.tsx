"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemePicker } from "@/components/theme-picker"

export function ThemeMenuButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger nativeButton render={<Button variant="ghost" size="sm" />}>
        Theme
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-44 w-max">
        <ThemePicker />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
