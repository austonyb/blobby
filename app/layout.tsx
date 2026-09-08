import type { Metadata } from "next";
import { Recursive } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const recursive = Recursive({
  subsets: ["latin"],
  axes: ["CASL", "MONO", "CRSV"],
  variable: "--font-recursive",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Blobby",
  description: "A simple file browser for Vercel Blob",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${recursive.variable} h-full`}
    >
      <body className="flex h-full flex-col overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
