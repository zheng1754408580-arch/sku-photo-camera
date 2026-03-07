"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut, getRedirectByStatus } from "@/lib/auth";

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
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <svg
            className="h-8 w-8 text-amber-500"
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

        <h1 className="mb-2 text-xl font-bold">申请已提交</h1>
        <p className="mb-8 text-sm text-gray-500">
          你的使用申请正在等待管理员审批，审批通过后即可使用全部功能。
        </p>

        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            className="w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 active:scale-[0.98]"
          >
            刷新状态
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
