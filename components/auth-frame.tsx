import { BlobbyMark } from "@/components/blobby-mark"
import { BrandLink } from "@/components/brand-link"
import { ThemeMenuButton } from "@/components/theme-menu-button"

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6">
      <BlobbyMark className="pointer-events-none absolute -top-[18%] -right-[12%] size-[min(72vw,34rem)] text-primary opacity-[0.12]" />
      <div className="relative z-10 flex w-full max-w-[20rem] flex-col items-center gap-6">
        <BrandLink markClassName="size-8" />
        <div className="w-full">{children}</div>
        <ThemeMenuButton />
      </div>
    </main>
  )
}
