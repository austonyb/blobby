"use server"

import { redirect } from "next/navigation"

import { createFirstAdmin, hasUsers, verifyPassword } from "@/lib/auth/users"
import { clearSession, createSession } from "@/lib/session"

export type AuthFormState = {
  error?: string
} | undefined

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "")
  const password = String(formData.get("password") ?? "")
  if (!username || !password) {
    return { error: "Enter a username and password." }
  }

  try {
    const user = await verifyPassword(username, password)
    if (!user) {
      return { error: "Invalid username or password." }
    }
    await createSession({
      id: user.id,
      username: user.username,
      role: user.role,
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not sign in.",
    }
  }

  redirect("/")
}

export async function setupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "")
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")

  if (password !== confirm) {
    return { error: "Passwords do not match." }
  }

  try {
    if (await hasUsers()) {
      return { error: "An account already exists. Sign in instead." }
    }
    const user = await createFirstAdmin(username, password)
    await createSession(user)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create account.",
    }
  }

  redirect("/")
}

export async function logoutAction() {
  await clearSession()
  redirect("/login")
}
