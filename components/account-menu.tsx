"use client"

import Link from "next/link"

import { logoutAction } from "@/app/actions/auth"
import { ThemePicker } from "@/components/theme-picker"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AccountMenu({
  username,
  isAdmin,
}: {
  username: string
  isAdmin?: boolean
}) {
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton
          render={<Button variant="ghost" size="sm" />}
        >
          {username}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isAdmin ? (
            <DropdownMenuItem
              nativeButton={false}
              render={<Link href="/settings" />}
            >
              Settings
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-44">
              <ThemePicker />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            nativeButton
            render={<button type="submit" form="sign-out-form" />}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form id="sign-out-form" action={logoutAction} className="hidden" />
    </>
  )
}
