"use client"

import type { ReactNode } from "react"

import { AccountMenu } from "@/components/account-menu"
import { BrandLink } from "@/components/brand-link"

export function AppHeader({
  username,
  isAdmin,
  children,
}: {
  username?: string
  isAdmin?: boolean
  children?: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BrandLink className="shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {username ? <AccountMenu username={username} isAdmin={isAdmin} /> : null}
    </div>
  )
}
