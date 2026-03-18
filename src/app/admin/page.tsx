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
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

const TABS: { key: AccessStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AccessStatus>("pending");
  const [list, setList] = useState<UserAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchList = useCallback(async (status: AccessStatus) => {
    const data = await getAccessRequests(status);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchList(tab);
        if (!cancelled) {
          setList(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
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
    <div className="app-page mx-auto min-h-dvh max-w-lg">
      {/* 顶部栏 */}
      <div className="sticky top-0 z-10 border-b border-soft bg-[hsl(var(--surface-raised))/0.92] backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="section-title text-lg">Admin</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push("/app")}
              variant="secondary"
              size="sm"
            >
              App
            </Button>
            <Button
              onClick={handleLogout}
              variant="secondary"
              size="sm"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-t border-soft">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-center text-sm font-semibold transition ${
                tab === t.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
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
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-input border-t-primary" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {tab === "pending" ? "No pending requests" : "No records found"}
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
  const time = new Date(item.created_at).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const reviewTime = item.reviewed_at
    ? new Date(item.reviewed_at).toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <SurfaceCard className="rounded-[1.5rem] p-4 shadow-soft">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="break-words text-sm font-semibold text-foreground">
            {item.display_name || "Unnamed user"}
          </p>
          <p className="break-all text-xs text-muted-foreground">{item.email}</p>
        </div>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>

      {item.reason && (
        <p className="break-words mb-3 rounded-[1rem] bg-secondary px-3 py-2 text-xs text-muted-foreground">
          {item.reason}
        </p>
      )}

      {tab === "pending" && (
        <div className="flex gap-2">
          <Button
            onClick={onApprove}
            disabled={isLoading}
            fullWidth
            className="bg-[hsl(var(--success))]"
          >
            {isLoading ? "Processing..." : "Approve"}
          </Button>
          <Button
            onClick={onReject}
            disabled={isLoading}
            variant="destructive"
            fullWidth
          >
            Reject
          </Button>
        </div>
      )}

      {tab !== "pending" && reviewTime && (
        <p className="text-xs text-muted-foreground">
          {tab === "approved" ? "Approved" : "Rejected"} on {reviewTime}
        </p>
      )}
    </SurfaceCard>
  );
}
