import { randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"

import { getJson, putJson } from "@/lib/blob"
import { USERS_PATH } from "@/lib/paths"

export type StoredUser = {
  id: string
  username: string
  passwordHash: string
  role: "admin" | "user"
  createdAt: string
}

type UsersFile = {
  version: 1
  users: StoredUser[]
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(username))
}

export async function readUsers(): Promise<{
  users: StoredUser[]
  etag?: string
}> {
  const { data, etag } = await getJson<UsersFile>(USERS_PATH)
  return { users: data?.users ?? [], etag }
}

export async function hasUsers(): Promise<boolean> {
  const { users } = await readUsers()
  return users.length > 0
}

export async function findUser(username: string): Promise<StoredUser | null> {
  const { users } = await readUsers()
  const key = normalizeUsername(username)
  return users.find((user) => user.username === key) ?? null
}

export async function createUser(
  username: string,
  password: string,
  role: StoredUser["role"],
) {
  if (!isValidUsername(username)) {
    throw new Error(
      "Username must be 3–32 characters: lowercase letters, numbers, underscore.",
    )
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.")
  }

  const { users, etag } = await readUsers()
  const key = normalizeUsername(username)
  if (users.some((user) => user.username === key)) {
    throw new Error("That username is taken.")
  }

  const user: StoredUser = {
    id: randomUUID(),
    username: key,
    passwordHash: await bcrypt.hash(password, 12),
    role,
    createdAt: new Date().toISOString(),
  }

  await putJson(
    USERS_PATH,
    { version: 1, users: [...users, user] } satisfies UsersFile,
    etag,
  )

  return { id: user.id, username: user.username, role: user.role }
}

export async function createFirstAdmin(username: string, password: string) {
  const { users } = await readUsers()
  if (users.length > 0) {
    throw new Error("An account already exists. Sign in instead.")
  }
  return createUser(username, password, "admin")
}

export async function verifyPassword(
  username: string,
  password: string,
): Promise<StoredUser | null> {
  const user = await findUser(username)
  if (!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  return ok ? user : null
}
