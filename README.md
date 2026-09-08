# Blobby

A Dropbox-style file browser for a **private** [Vercel Blob](https://vercel.com/docs/vercel-blob) store.

Built with Next.js, shadcn/ui, and `@vercel/blob`. Files stay private: the app lists, uploads, and streams them through your own routes. Accounts live on the Blob store under `.config/auth`; sessions are signed cookies.

## Features

- Folder browse with breadcrumbs, search, sort, and a sticky preview pane
- Preview images, video, audio, PDF, and text; download everything else
- Upload (button or drag-and-drop), new folder, rename, delete
- First-run admin signup
- Admin invite links (copy and send yourself — no email)
- `.config` is hidden from the file list and blocked on upload/delete/rename
- Light, dark, system, and extra themes (Tokyo Night, Catppuccin, Peach)

## Requirements

- Node 20+ and [pnpm](https://pnpm.io)
- A **private** Vercel Blob store
- `BLOB_READ_WRITE_TOKEN` and `BLOB_STORE_ID` from the Blob dashboard

## Local setup

```bash
pnpm install
cp env.example .env.local
```

In `.env.local`:

| Variable | Required | Notes |
|----------|----------|--------|
| `BLOB_READ_WRITE_TOKEN` | yes | Needed for list/upload/delete and client-token uploads |
| `BLOB_STORE_ID` | yes | `store_…` from the Blob dashboard |
| `BLOB_STORE_URL` | no | Store base URL, e.g. `https://….private.blob.vercel-storage.com` |
| `AUTH_SECRET` | no | Signs login cookies. Generate with `openssl rand -base64 32`. Falls back to the Blob token if unset |

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Accounts

1. First visit redirects to `/login` and shows **Create admin account**.
2. Username: 3–32 characters, lowercase letters, numbers, underscore.
3. Password: at least 8 characters.
4. That writes `.config/auth/users.json` on the Blob store (not shown in the browser).

### Invite someone

1. Sign in as admin.
2. Click your name in the top right → **Settings**.
3. Optionally check **Invite as admin**.
4. **Create invite link**, then **Copy**.
5. Send the URL yourself.

On Settings you can also change roles and remove people. You cannot remove or demote the last admin, or delete your own account.

Links expire in 7 days and work once. Pending invites can be revoked. The raw token is hashed in Blob, so the full URL is only shown at create time.

## Deploy on Vercel

1. Import [this repo](https://github.com/austonyb/blobby) (or `vercel` from the project root).
2. Connect the Blob store to the project (Storage → Blob).
3. Set the same env vars as `.env.local` for Production (and Preview if you want).
4. Deploy.

On Vercel, OIDC can cover some Blob reads, but **uploads still need** `BLOB_READ_WRITE_TOKEN`.

Anyone who can reach the URL must sign in. That is not a substitute for keeping the deployment private if you need extra lock-down (Vercel Deployment Protection, etc.).

## Stack

- Next.js 16 App Router
- shadcn/ui (Base UI)
- `@vercel/blob` (private store, folded listings, client uploads)
- `jose` session cookies + `bcryptjs` password hashes
