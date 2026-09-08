import Link from "next/link"
import { redirect } from "next/navigation"

import { InviteManager } from "@/app/invites/invite-manager"
import { UserManager } from "@/app/settings/user-manager"
import { listInvites } from "@/lib/auth/invites"
import { listPublicUsers } from "@/lib/auth/users"
import { getSession } from "@/lib/session"

export default async function SettingsPage() {
  const session = await getSession()
  if (session?.role !== "admin") {
    redirect("/")
  }

  const [users, invites] = await Promise.all([listPublicUsers(), listInvites()])

  return (
    <main className="mx-auto flex h-full w-full max-w-3xl flex-col gap-8 overflow-auto p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage people and invite links.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to files
        </Link>
      </div>
      <UserManager users={users} currentUserId={session.id} />
      <div className="grid gap-3">
        <div>
          <h2 className="text-sm font-medium">Invites</h2>
          <p className="text-sm text-muted-foreground">
            Create a link, copy it, and send it yourself. No email.
          </p>
        </div>
        <InviteManager invites={invites} />
      </div>
    </main>
  )
}
