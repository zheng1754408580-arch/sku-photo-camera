"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getAccessRequests,
  approveUser,
  rejectUser,
} from "@/lib/adminActions";
import { signOut } from "@/lib/auth";
import type { AccessStatus, UserAccess } from "@/types";

const TABS: { key: AccessStatus; label: string }[] = [
  { key: "pending", label: "待审批" },
  { key: "approved", label: "已批准" },
  { key: "rejected", label: "已拒绝" },
];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AccessStatus>("pending");
  const [list, setList] = useState<UserAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchList = useCallback(async (status: AccessStatus) => {
    setLoading(true);
    const data = await getAccessRequests(status);
    setList(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchList(tab);
  }, [tab, fetchList]);

  const handleApprove = useCallback(
    async (item: UserAccess) => {
      setActionLoading(item.id);
      const result = await approveUser(item.id);
      if (result.success) {
        setList((prev) => prev.filter((r) => r.id !== item.id));
      }
      setActionLoading(null);
    },
    [],
  );

  const handleReject = useCallback(
    async (item: UserAccess) => {
      setActionLoading(item.id);
      const result = await rejectUser(item.id);
      if (result.success) {
        setList((prev) => prev.filter((r) => r.id !== item.id));
      }
      setActionLoading(null);
    },
    [],
  );

  const handleLogout = useCallback(async () => {
    await signOut();
    router.push("/");
  }, [router]);

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-white">
      {/* 顶部栏 */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">管理后台</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/app")}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              应用
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              退出
            </button>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-t border-gray-100">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-center text-sm font-medium transition ${
                tab === t.key
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {tab === "pending" ? "暂无待审批申请" : "暂无记录"}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((item) => (
              <RequestCard
                key={item.id}
                item={item}
                tab={tab}
                isLoading={actionLoading === item.id}
                onApprove={() => handleApprove(item)}
                onReject={() => handleReject(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestCard({
  item,
  tab,
  isLoading,
  onApprove,
  onReject,
}: {
  item: UserAccess;
  tab: AccessStatus;
  isLoading: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const time = new Date(item.created_at).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const reviewTime = item.reviewed_at
    ? new Date(item.reviewed_at).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {item.display_name || "未填写姓名"}
          </p>
          <p className="text-xs text-gray-500">{item.email}</p>
        </div>
        <span className="text-xs text-gray-400">{time}</span>
      </div>

      {item.reason && (
        <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
          {item.reason}
        </p>
      )}

      {tab === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-green-500 py-2 text-sm font-semibold text-white transition hover:bg-green-600 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? "处理中…" : "批准"}
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-red-200 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
          >
            拒绝
          </button>
        </div>
      )}

      {tab !== "pending" && reviewTime && (
        <p className="text-xs text-gray-400">
          {tab === "approved" ? "批准" : "拒绝"}于 {reviewTime}
        </p>
      )}
    </div>
  );
}
