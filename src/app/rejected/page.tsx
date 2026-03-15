"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export default function RejectedPage() {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await signOut();
    router.push("/");
  }, [router]);

  return (
    <div className="app-page flex min-h-dvh flex-col items-center justify-center px-6">
      <SurfaceCard className="mx-auto w-full max-w-sm px-6 py-7 text-center">
        <div className="icon-badge mx-auto mb-5 h-16 w-16 bg-destructive-soft text-destructive">
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
              d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        <h1 className="section-title mb-2 text-xl">申请未通过</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          很抱歉，你的使用申请未通过审批。如有疑问，请联系管理员。
        </p>

        <Button onClick={handleLogout} variant="secondary" fullWidth>
          退出登录
        </Button>
      </SurfaceCard>
    </div>
  );
}
