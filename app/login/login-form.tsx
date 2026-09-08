"use client"

import { useActionState } from "react"

import { loginAction, setupAction, type AuthFormState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LoginFormProps = {
  needsSetup: boolean
}

export function LoginForm({ needsSetup }: LoginFormProps) {
  const action = needsSetup ? setupAction : loginAction
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    undefined,
  )

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-lg font-medium">
          {needsSetup ? "Create admin account" : "Sign in"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {needsSetup
            ? "This creates the first account on your Blob store."
            : "Use your Blobby username and password."}
        </p>
      </div>
      <form action={formAction} className="grid gap-3">
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
            autoComplete={needsSetup ? "new-password" : "current-password"}
            required
            minLength={8}
            className="bg-card"
          />
        </div>
        {needsSetup ? (
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
        ) : null}
        {state?.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        <Button type="submit" disabled={pending} className="mt-1">
          {pending
            ? "Please wait…"
            : needsSetup
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>
    </div>
  )
}
