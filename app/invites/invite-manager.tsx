"use client"

import { useActionState } from "react"
import { toast } from "sonner"

import {
  createInviteAction,
  revokeInviteAction,
  type CreateInviteState,
} from "@/app/actions/invites"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/file-kind"
import type { PublicInvite } from "@/lib/auth/invites"

type InviteManagerProps = {
  invites: PublicInvite[]
}

export function InviteManager({ invites }: InviteManagerProps) {
  const [state, formAction, pending] = useActionState<
    CreateInviteState,
    FormData
  >(createInviteAction, undefined)
  const invitePath = state?.token ? `/invite/${state.token}` : ""

  async function copyLink() {
    if (!state?.token) return
    const url = `${window.location.origin}/invite/${state.token}`
    await navigator.clipboard.writeText(url)
    toast.success("Invite link copied")
  }

  return (
    <div className="grid gap-8">
      <form action={formAction} className="grid gap-3 sm:max-w-md">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="role"
            value="admin"
            className="size-4 rounded border-input"
          />
          Invite as admin
        </label>
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Creating…" : "Create invite link"}
        </Button>
        {state?.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
      </form>

      {invitePath ? (
        <div className="grid gap-2 sm:max-w-xl">
          <Label htmlFor="invite-link">Share this link</Label>
          <p className="text-xs text-muted-foreground">
            Copy it now and send it yourself. The raw token is not stored, so
            you cannot recover this URL later. Expires in 7 days; one use.
          </p>
          <div className="flex gap-2">
            <Input id="invite-link" readOnly value={invitePath} />
            <Button type="button" variant="outline" onClick={() => void copyLink()}>
              Copy
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <h2 className="text-sm font-medium">Invites</h2>
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invites yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>{invite.role}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{invite.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invite.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invite.expiresAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {invite.status === "pending" ? (
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="id" value={invite.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Revoke
                        </Button>
                      </form>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
