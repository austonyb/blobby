import { Suspense } from "react";

import { FileBrowser } from "@/components/file-browser/file-browser";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";

function BrowserFallback() {
  return (
    <div className="flex flex-1 flex-col gap-3 p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="min-h-64 flex-1" />
    </div>
  );
}

export default async function Home() {
  const session = await getSession();

  return (
    <main className="flex h-svh min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense fallback={<BrowserFallback />}>
        <FileBrowser
          username={session?.username}
          isAdmin={session?.role === "admin"}
        />
      </Suspense>
    </main>
  );
}
