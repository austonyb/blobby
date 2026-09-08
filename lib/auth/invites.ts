import { createHash, randomBytes, randomUUID } from "node:crypto"

import { getJson, putJson } from "@/lib/blob"
import { INVITES_PATH } from "@/lib/paths"

import { createUser, type StoredUser } from "@/lib/auth/users"

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type StoredInvite = {
  id: string
  tokenHash: string
  role: StoredUser["role"]
  createdBy: string
  createdAt: string
  expiresAt: string
  usedAt?: string
  usedBy?: string
  revokedAt?: string
}

type InvitesFile = {
  version: 1
  invites: StoredInvite[]
}

export type InviteStatus = "pending" | "used" | "expired" | "revoked"

export type PublicInvite = {
  id: string
  role: StoredUser["role"]
  createdAt: string
  expiresAt: string
  status: InviteStatus
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function statusOf(invite: StoredInvite, now = Date.now()): InviteStatus {
  if (invite.revokedAt) return "revoked"
  if (invite.usedAt) return "used"
  if (new Date(invite.expiresAt).getTime() <= now) return "expired"
  return "pending"
}

function toPublic(invite: StoredInvite): PublicInvite {
  return {
    id: invite.id,
    role: invite.role,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    status: statusOf(invite),
  }
}

async function readInvites(): Promise<{
  invites: StoredInvite[]
  etag?: string
}> {
  const { data, etag } = await getJson<InvitesFile>(INVITES_PATH)
  return { invites: data?.invites ?? [], etag }
}

export async function listInvites(): Promise<PublicInvite[]> {
  const { invites } = await readInvites()
  return invites
    .map(toPublic)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function peekInvite(token: string): Promise<PublicInvite | null> {
  const { invites } = await readInvites()
  const tokenHash = hashToken(token)
  const invite = invites.find((item) => item.tokenHash === tokenHash)
  return invite ? toPublic(invite) : null
}

export async function createInvite(input: {
  createdBy: string
  role: StoredUser["role"]
}): Promise<{ token: string; invite: PublicInvite }> {
  const { invites, etag } = await readInvites()
  const token = randomBytes(32).toString("base64url")
  const now = new Date()
  const invite: StoredInvite = {
    id: randomUUID(),
    tokenHash: hashToken(token),
    role: input.role,
    createdBy: input.createdBy,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + INVITE_TTL_MS).toISOString(),
  }

  await putJson(
    INVITES_PATH,
    { version: 1, invites: [invite, ...invites] } satisfies InvitesFile,
    etag,
  )

  return { token, invite: toPublic(invite) }
}

export async function revokeInvite(id: string) {
  const { invites, etag } = await readInvites()
  const index = invites.findIndex((invite) => invite.id === id)
  if (index === -1) {
    throw new Error("Invite not found.")
  }
  if (statusOf(invites[index]) !== "pending") {
    throw new Error("Only pending invites can be revoked.")
  }

  const next = invites.slice()
  next[index] = { ...next[index], revokedAt: new Date().toISOString() }
  await putJson(
    INVITES_PATH,
    { version: 1, invites: next } satisfies InvitesFile,
    etag,
  )
}

export async function acceptInvite(input: {
  token: string
  username: string
  password: string
}) {
  const { invites } = await readInvites()
  const tokenHash = hashToken(input.token)
  const invite = invites.find((item) => item.tokenHash === tokenHash)
  if (!invite) {
    throw new Error("This invite link is invalid.")
  }

  const status = statusOf(invite)
  if (status === "used") {
    throw new Error("This invite has already been used.")
  }
  if (status === "revoked") {
    throw new Error("This invite was revoked.")
  }
  if (status === "expired") {
    throw new Error("This invite has expired.")
  }

  const user = await createUser(input.username, input.password, invite.role)

  const latest = await readInvites()
  const index = latest.invites.findIndex((item) => item.id === invite.id)
  if (index !== -1 && statusOf(latest.invites[index]) === "pending") {
    const next = latest.invites.slice()
    next[index] = {
      ...next[index],
      usedAt: new Date().toISOString(),
      usedBy: user.id,
    }
    await putJson(
      INVITES_PATH,
      { version: 1, invites: next } satisfies InvitesFile,
      latest.etag,
    )
  }

  return user
}
