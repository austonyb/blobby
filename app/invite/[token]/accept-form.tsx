"use client"

import { useActionState } from "react"

import { acceptInviteAction } from "@/app/actions/invites"
import type { AuthFormState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AcceptInviteFormProps = {
  token: string
  role: string
}

export function AcceptInviteForm({ token, role }: AcceptInviteFormProps) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    acceptInviteAction,
    undefined,
  )

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-lg font-medium">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          You were invited as {role}. Pick a username and password.
        </p>
      </div>
      <form action={formAction} className="grid gap-3">
        <input type="hidden" name="token" value={token} />
        <div className="grid gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
            className="bg-card"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="bg-card"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="bg-card"
          />
        </div>
        {state?.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? "Please wait…" : "Create account"}
        </Button>
      </form>
    </div>
  )
}
