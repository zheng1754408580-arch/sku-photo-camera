"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/app";
  const isCamera = pathname === "/app/camera";

  if (isCamera) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {!isHome && (
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-lg">
          <div className="mx-auto flex h-12 max-w-lg items-center px-4">
            <Link
              href="/app"
              className="flex items-center gap-1 text-sm font-medium text-blue-500 transition hover:text-blue-600"
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
