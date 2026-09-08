"use client"

import { useActionState } from "react"

import { loginAction, setupAction, type AuthFormState } from "@/app/actions/auth"
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{needsSetup ? "Create admin account" : "Sign in"}</CardTitle>
        <CardDescription>
          {needsSetup
            ? "No users yet. This creates the first account in .config/auth on your Blob store."
            : "Use your Blobby username and password."}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
