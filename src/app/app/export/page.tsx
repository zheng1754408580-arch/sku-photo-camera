"use client";

import { Suspense, useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSkuStore } from "@/store/skuStore";
import { usePhotoStore } from "@/store/photoStore";
import { useFittingSessionStore } from "@/store/fittingSessionStore";
import {
  exportAsZip,
  sharePhotos,
  type ExportProgress,
} from "@/services/exportService";
import { Button } from "@/components/ui/Button";

type ExportStatus =
  | { step: "idle" }
  | { step: "exporting"; progress: ExportProgress }
  | { step: "done"; method: string }
  | { step: "error"; message: string };

function ExportPageContent() {
  const searchParams = useSearchParams();
  const { skuList } = useSkuStore();
  const { photos, getPhotoCount } = usePhotoStore();
  const {
    sessions,
    getSession,
    getAllPhotosMap: getAllFittingPhotosMap,
    getPhotoCountForStyle,
  } = useFittingSessionStore();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<ExportStatus>({ step: "idle" });
  const [hydrated, setHydrated] = useState(false);

  const sessionId = searchParams.get("sessionId");
  const currentSession = sessionId ? getSession(sessionId) : null;

  useEffect(() => {
    setHydrated(true);
  }, []);

  const combinedPhotos = useMemo(() => {
    if (currentSession) {
      return {
        [currentSession.styleNo]: currentSession.photos.map((photo) => ({
          uri: photo.uri,
          fileName: photo.fileName,
        })),
      };
    }

    const fittingPhotos = getAllFittingPhotosMap();
    const keys = new Set([...Object.keys(photos), ...Object.keys(fittingPhotos)]);
    const next: Record<string, Array<{ uri: string; fileName: string }>> = {};

    keys.forEach((sku) => {
      next[sku] = [...(photos[sku] ?? []), ...(fittingPhotos[sku] ?? [])];
    });

    return next;
  }, [currentSession, getAllFittingPhotosMap, photos, sessions]);

  const skusWithPhotos = useMemo(
    () =>
      currentSession
        ? [currentSession.styleNo]
        : skuList.filter((sku) => (combinedPhotos[sku]?.length ?? 0) > 0),
    [combinedPhotos, currentSession, skuList],
  );

  useEffect(() => {
    if (hydrated && skusWithPhotos.length > 0 && selected.size === 0) {
      setSelected(new Set(skusWithPhotos));
    }
  }, [hydrated, skusWithPhotos, selected.size]);

  const totalSelected = useMemo(
    () =>
      Array.from(selected).reduce(
        (sum, sku) => sum + (combinedPhotos[sku]?.length ?? 0),
        0,
      ),
    [combinedPhotos, selected],
  );

  const toggleSku = useCallback((sku: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(
      selected.size === skusWithPhotos.length ? new Set() : new Set(skusWithPhotos),
    );
  }, [selected.size, skusWithPhotos]);

  const handleExportZip = useCallback(async () => {
    if (selected.size === 0) return;
    setStatus({
      step: "exporting",
      progress: { current: 0, total: 1, currentSku: "" },
    });
    try {
      await exportAsZip(combinedPhotos, Array.from(selected), (p) =>
        setStatus({ step: "exporting", progress: p }),
      );
      setStatus({ step: "done", method: "ZIP 下载" });
    } catch (err) {
      setStatus({
        step: "error",
        message: err instanceof Error ? err.message : "导出失败",
      });
    }
  }, [combinedPhotos, selected]);

  const handleShare = useCallback(async () => {
    if (selected.size === 0) return;
    setStatus({
      step: "exporting",
      progress: { current: 0, total: 1, currentSku: "" },
    });
    try {
      await sharePhotos(combinedPhotos, Array.from(selected), (p) =>
        setStatus({ step: "exporting", progress: p }),
      );
      setStatus({ step: "done", method: "分享" });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setStatus({ step: "idle" });
        return;
      }
      setStatus({
        step: "error",
        message: err instanceof Error ? err.message : "分享失败",
      });
    }
  }, [combinedPhotos, selected]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-input border-t-primary" />
      </div>
    );
  }

  if (skusWithPhotos.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">暂无照片可导出</p>
        <p className="mt-1 text-xs text-muted-foreground/80">请先拍摄照片后再进行导出</p>
      </div>
    );
  }

  const allSelected = selected.size === skusWithPhotos.length;
  const progressPercent =
    status.step === "exporting" && status.progress.total > 0
      ? (status.progress.current / status.progress.total) * 100
      : 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-lg flex-col">
      <div className="border-b border-soft bg-[hsl(var(--surface-raised))/0.9] px-4 py-4 backdrop-blur-lg">
        <h2 className="section-title mb-1 text-lg">导出照片</h2>
        <p className="text-sm text-muted-foreground">
          {currentSession
            ? `当前导出 ${currentSession.styleNo} / ${currentSession.fittingRound} 本轮照片，共 ${totalSelected} 张`
            : `共 ${skusWithPhotos.length} 个 SKU 有照片，已选 ${selected.size} 个（${totalSelected} 张）`}
        </p>
      </div>

      <div className="flex items-center justify-between border-b border-soft bg-[hsl(var(--surface-raised))/0.88] px-4 py-3">
        <button onClick={toggleAll} className="text-sm font-semibold text-primary transition hover:opacity-80">
          {allSelected ? "取消全选" : "全选"}
        </button>
        <span className="text-xs text-muted-foreground">
          {selected.size} / {skusWithPhotos.length} 已选
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {skusWithPhotos.map((sku) => {
          const count = currentSession
            ? combinedPhotos[sku]?.length ?? 0
            : getPhotoCount(sku) + getPhotoCountForStyle(sku);
          const checked = selected.has(sku);
          return (
            <button
              key={sku}
              onClick={() => toggleSku(sku)}
              className="flex w-full items-center gap-3 rounded-[1.25rem] border border-soft bg-surface-raised px-3 py-3 text-left shadow-soft transition hover:bg-secondary active:scale-[0.99]"
            >
              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${
                  checked ? "border-primary bg-primary" : "border-input bg-card"
                }`}
              >
                {checked && (
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {sku}
              </span>
              <span className="text-xs text-muted-foreground">{count} 张</span>
            </button>
          );
        })}
      </div>

      {status.step === "exporting" && (
        <div className="border-t border-soft bg-[hsl(var(--surface-raised))/0.88] px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">
              导出中… {status.progress.currentSku}
            </span>
            <span className="text-xs text-muted-foreground">
              {status.progress.current} / {status.progress.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {status.step === "done" && (
        <div className="border-t border-soft bg-success-soft px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-success-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span className="text-sm font-semibold text-success-foreground">
              {status.method}完成！
            </span>
          </div>
        </div>
      )}

      {status.step === "error" && (
        <div className="border-t border-soft bg-destructive-soft px-4 py-3">
          <p className="text-sm font-medium text-destructive">{status.message}</p>
        </div>
      )}

      <div className="border-t border-soft bg-[hsl(var(--surface-raised))/0.92] px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="flex gap-3">
          <Button
            onClick={handleExportZip}
            disabled={selected.size === 0 || status.step === "exporting"}
            fullWidth
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            下载 ZIP
          </Button>
          <Button
            onClick={handleShare}
            disabled={selected.size === 0 || status.step === "exporting"}
            variant="secondary"
            fullWidth
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
              />
            </svg>
            分享
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ExportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-input border-t-primary" />
        </div>
      }
    >
      <ExportPageContent />
    </Suspense>
  );
}
