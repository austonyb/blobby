"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { acceptInvite, createInvite, revokeInvite } from "@/lib/auth/invites"
import { getSession, createSession } from "@/lib/session"

import type { AuthFormState } from "@/app/actions/auth"

export type CreateInviteState =
  | { error?: string; token?: string }
  | undefined

export async function createInviteAction(
  _prev: CreateInviteState,
  formData: FormData,
): Promise<CreateInviteState> {
  const session = await getSession()
  if (session?.role !== "admin") {
    return { error: "Only admins can create invite links." }
  }

  const role = formData.get("role") === "admin" ? "admin" : "user"

  try {
    const { token } = await createInvite({
      createdBy: session.id,
      role,
    })
    revalidatePath("/invites")
    return { token }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create invite.",
    }
  }
}

export async function revokeInviteAction(formData: FormData) {
  const session = await getSession()
  if (session?.role !== "admin") {
    throw new Error("Only admins can revoke invites.")
  }
  const id = String(formData.get("id") ?? "")
  if (!id) return
  await revokeInvite(id)
  revalidatePath("/invites")
}

export async function acceptInviteAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const token = String(formData.get("token") ?? "")
  const username = String(formData.get("username") ?? "")
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")

  if (!token) {
    return { error: "Missing invite token." }
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." }
  }

  try {
    const user = await acceptInvite({ token, username, password })
    await createSession(user)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create account.",
    }
  }

  redirect("/")
}
