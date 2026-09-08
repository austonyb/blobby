import { redirect } from "next/navigation"

import { AuthFrame } from "@/components/auth-frame"
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
    <AuthFrame>
      {configError ? (
        <p className="text-center text-sm text-muted-foreground">{configError}</p>
      ) : (
        <LoginForm needsSetup={needsSetup} />
      )}
    </AuthFrame>
  )
}
