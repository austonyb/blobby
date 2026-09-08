import { redirect } from "next/navigation"

import { BlobbyMark } from "@/components/blobby-mark"
import { ThemeMenuButton } from "@/components/theme-menu-button"
import { LoginForm } from "@/app/login/login-form"
import { hasUsers } from "@/lib/auth/users"
import { isBlobConfigured } from "@/lib/blob"
import { getSession } from "@/lib/session"

export default async function LoginPage() {
  const session = await getSession()
  if (session) {
    redirect("/")
  }

  let needsSetup = false
  let configError: string | null = null

  if (!isBlobConfigured()) {
    configError =
      "Vercel Blob is not configured. Add BLOB_READ_WRITE_TOKEN to .env.local."
  } else {
    try {
      needsSetup = !(await hasUsers())
    } catch (error) {
      configError =
        error instanceof Error ? error.message : "Could not read user store."
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2">
        <BlobbyMark className="size-8" />
        <span className="text-lg font-semibold tracking-tight">Blobby</span>
      </div>
      {configError ? (
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          {configError}
        </p>
      ) : (
        <LoginForm needsSetup={needsSetup} />
      )}
      <ThemeMenuButton />
    </main>
  )
}
