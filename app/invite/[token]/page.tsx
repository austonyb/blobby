import { redirect } from "next/navigation"

import { AuthFrame } from "@/components/auth-frame"
import { AcceptInviteForm } from "@/app/invite/[token]/accept-form"
import { peekInvite } from "@/lib/auth/invites"
import { getSession } from "@/lib/session"

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const session = await getSession()
  if (session) {
    redirect("/")
  }

  const { token } = await params
  const invite = await peekInvite(token)

  let message: string | null = null
  if (!invite) {
    message = "This invite link is invalid."
  } else if (invite.status === "used") {
    message = "This invite has already been used."
  } else if (invite.status === "revoked") {
    message = "This invite was revoked."
  } else if (invite.status === "expired") {
    message = "This invite has expired. Ask an admin for a new link."
  }

  return (
    <AuthFrame>
      {message ? (
        <p className="text-center text-sm text-muted-foreground">{message}</p>
      ) : (
        <AcceptInviteForm token={token} role={invite?.role ?? "user"} />
      )}
    </AuthFrame>
  )
}
