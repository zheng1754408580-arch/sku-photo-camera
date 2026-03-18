"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut, getRedirectByStatus } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export default function PendingPage() {
  const router = useRouter();

  const handleRefresh = useCallback(async () => {
    const target = await getRedirectByStatus();
    if (target !== "/pending") {
      router.push(target);
    } else {
      router.refresh();
    }
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
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>

        <h1 className="section-title mb-2 text-xl">Request Submitted</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Your access request is waiting for admin approval. Once approved, you will be able to use the full workflow.
        </p>

        <div className="space-y-3">
          <Button onClick={handleRefresh} fullWidth>
            Refresh Status
          </Button>
          <Button onClick={handleLogout} variant="secondary" fullWidth>
            Sign Out
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}
