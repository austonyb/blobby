import Link from "next/link"

import { BlobbyMark } from "@/components/blobby-mark"
import { cn } from "cn"

export function BrandLink({
  className,
  markClassName,
}: {
  className?: string
  markClassName?: string
}) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 text-foreground", className)}
    >
      <BlobbyMark className={cn("size-7 text-primary", markClassName)} />
      <span className="font-wordmark text-[1.125rem] leading-none">Blobby</span>
    </Link>
  )
}
