"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";

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
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
          <svg
            className="h-8 w-8 text-orange-500"
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

        <h1 className="mb-2 text-xl font-bold">无访问权限</h1>
        <p className="mb-8 text-sm text-gray-500">
          你没有权限访问该页面。此功能仅限管理员使用。
        </p>

        <div className="space-y-3">
          <button
            onClick={handleBack}
            className="w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 active:scale-[0.98]"
          >
            返回应用
          </button>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50 active:scale-[0.98]"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
