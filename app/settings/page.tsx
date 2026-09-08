import { redirect } from "next/navigation"

import { AppHeader } from "@/components/app-header"
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
    <main className="flex h-svh min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border px-4 py-3 sm:px-6">
        <AppHeader username={session.username} isAdmin />
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
          <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage people and invite links.
            </p>
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
        </div>
      </div>
    </main>
  )
}
