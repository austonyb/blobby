# Blobby

A simple Dropbox-style file browser for a private [Vercel Blob](https://vercel.com/docs/vercel-blob) store.

- Browse folders, preview files, upload, rename, delete
- Private blobs are streamed through the app (never public URLs)
- Accounts live in `.config/auth` on the Blob store; sessions are signed cookies
- Admins create invite links and share them by hand (no email)

## Setup

```bash
pnpm install
cp env.example .env.local
```

Fill in `.env.local`:

- `BLOB_READ_WRITE_TOKEN`
- `BLOB_STORE_ID`
- `BLOB_STORE_URL` (optional)
- `AUTH_SECRET` (optional; falls back to the Blob token)

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The first visit creates the admin account. After that, **Invites** mints a one-time link.

## Deploy

Connect the Blob store to the Vercel project and set the same env vars. Anyone who can reach the deployment can use it only after signing in.
