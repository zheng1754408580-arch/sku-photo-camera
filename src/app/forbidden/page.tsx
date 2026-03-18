"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export default function ForbiddenPage() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.push("/app");
  }, [router]);

  const handleLogout = useCallback(async () => {
    await signOut();
    router.push("/");
  }, [router]);

  return (
    <div className="app-page flex min-h-dvh flex-col items-center justify-center px-6">
      <SurfaceCard className="mx-auto w-full max-w-sm px-6 py-7 text-center">
        <div className="icon-badge mx-auto mb-5 h-16 w-16 bg-warning-soft text-warning-foreground">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>

        <h1 className="section-title mb-2 text-xl">Access Denied</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          You do not have permission to access this page. This area is available to administrators only.
        </p>

        <div className="space-y-3">
          <Button onClick={handleBack} fullWidth>
            Back to App
          </Button>
          <Button onClick={handleLogout} variant="secondary" fullWidth>
            Sign Out
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}
