"use client"

import { useActionState } from "react"

import { acceptInviteAction } from "@/app/actions/invites"
import type { AuthFormState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          You were invited as {role}. Pick a username and password.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            />
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <Button type="submit" disabled={pending} className="mt-1">
            {pending ? "Please wait…" : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
