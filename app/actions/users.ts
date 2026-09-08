"use server"

import { revalidatePath } from "next/cache"

import { deleteUser, setUserRole, type StoredUser } from "@/lib/auth/users"
import { getSession } from "@/lib/session"

async function requireAdminId() {
  const session = await getSession()
  if (session?.role !== "admin") {
    throw new Error("Only admins can manage users.")
  }
  return session.id
}

export async function setUserRoleAction(formData: FormData) {
  const actorId = await requireAdminId()
  const id = String(formData.get("id") ?? "")
  const role = formData.get("role") === "admin" ? "admin" : "user"
  if (!id) return
  await setUserRole(id, role as StoredUser["role"], actorId)
  revalidatePath("/settings")
}

export async function deleteUserAction(formData: FormData) {
  const actorId = await requireAdminId()
  const id = String(formData.get("id") ?? "")
  if (!id) return
  await deleteUser(id, actorId)
  revalidatePath("/settings")
}
