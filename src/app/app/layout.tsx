"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/app";
  const isCamera = pathname === "/app/camera";
  const isFittingSession = pathname.startsWith("/app/fitting/session");

  if (isCamera || isFittingSession) {
    return <>{children}</>;
  }

  return (
    <div className="app-page flex min-h-dvh flex-col">
      {!isHome && (
        <header className="sticky top-0 z-40 border-b border-soft bg-[hsl(var(--surface-raised))/0.9] backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[430px] items-center px-4">
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised px-3 py-2 text-sm font-semibold text-primary shadow-soft transition hover:opacity-80"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              首页
            </Link>
          </div>
        </header>
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}
