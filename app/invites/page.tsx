import Link from "next/link"
import { redirect } from "next/navigation"

import { InviteManager } from "@/app/invites/invite-manager"
import { listInvites } from "@/lib/auth/invites"
import { getSession } from "@/lib/session"

export default async function InvitesPage() {
  const session = await getSession()
  if (session?.role !== "admin") {
    redirect("/")
  }

  const invites = await listInvites()

  return (
    <main className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 overflow-auto p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Invites</h1>
          <p className="text-sm text-muted-foreground">
            Create a link, copy it, and send it yourself. No email.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to files
        </Link>
      </div>
      <InviteManager invites={invites} />
    </main>
  )
}
