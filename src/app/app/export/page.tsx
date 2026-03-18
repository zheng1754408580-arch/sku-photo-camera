"use client";

import { Suspense, useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
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
    const frame = window.requestAnimationFrame(() => {
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
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
  }, [currentSession, getAllFittingPhotosMap, photos]);

  const skusWithPhotos = useMemo(
    () =>
      currentSession
        ? [currentSession.styleNo]
        : skuList.filter((sku) => (combinedPhotos[sku]?.length ?? 0) > 0),
    [combinedPhotos, currentSession, skuList],
  );

  useEffect(() => {
    if (hydrated && skusWithPhotos.length > 0 && selected.size === 0) {
      const frame = window.requestAnimationFrame(() => {
        setSelected(new Set(skusWithPhotos));
      });
      return () => window.cancelAnimationFrame(frame);
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

  const selectAll = useCallback(() => {
    setSelected(new Set(skusWithPhotos));
  }, [skusWithPhotos]);

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
      setStatus({ step: "done", method: "ZIP download" });
    } catch (err) {
      setStatus({
        step: "error",
        message: err instanceof Error ? err.message : "Export failed",
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
      setStatus({ step: "done", method: "Share" });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setStatus({ step: "idle" });
        return;
      }
      setStatus({
        step: "error",
        message: err instanceof Error ? err.message : "Share failed",
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
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[430px] flex-col items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">No photos available for export</p>
        <p className="mt-1 text-xs text-muted-foreground/80">Capture photos first before exporting.</p>
      </div>
    );
  }

  const progressPercent =
    status.step === "exporting" && status.progress.total > 0
      ? (status.progress.current / status.progress.total) * 100
      : 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[430px] flex-col px-4 pb-4 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link
          href="/app/camera"
          className="inline-flex h-10 items-center rounded-pill border border-soft bg-surface-raised px-3 text-sm font-semibold text-primary shadow-soft transition hover:bg-secondary"
        >
          Back
        </Link>
        <Link
          href="/app"
          className="inline-flex h-10 items-center rounded-pill border border-soft bg-surface-raised px-3 text-sm font-semibold text-foreground shadow-soft transition hover:bg-secondary"
        >
          Home
        </Link>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-[1.4rem] border border-soft bg-[hsl(var(--surface-raised))/0.88] px-4 py-3 shadow-soft">
        <button
          type="button"
          onClick={selectAll}
          className="text-sm font-semibold text-primary transition hover:opacity-80"
        >
          Select All
        </button>
        <span className="text-xs text-muted-foreground">
          {selected.size} / {skusWithPhotos.length} selected
        </span>
        <span className="text-xs text-muted-foreground">
          {totalSelected} photos
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {skusWithPhotos.map((sku) => {
          const count = currentSession
            ? combinedPhotos[sku]?.length ?? 0
            : getPhotoCount(sku) + getPhotoCountForStyle(sku);
          const checked = selected.has(sku);
          return (
            <button
              key={sku}
              onClick={() => toggleSku(sku)}
              aria-pressed={checked}
              className="flex w-full items-center gap-3 rounded-[1.25rem] border border-soft bg-surface-raised px-3 py-3 text-left shadow-soft transition hover:bg-secondary active:scale-[0.99]"
            >
              <div
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${
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
              <span className="text-xs text-muted-foreground">{count} photos</span>
            </button>
          );
        })}
      </div>

      {status.step === "exporting" && (
        <div className="mt-2 rounded-[1.4rem] border border-soft bg-[hsl(var(--surface-raised))/0.88] px-4 py-3 shadow-soft">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">
              Exporting... {status.progress.currentSku}
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
        <div className="mt-2 rounded-[1.4rem] border border-soft bg-success-soft px-4 py-3 shadow-soft">
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
              {status.method} complete
            </span>
          </div>
        </div>
      )}

      {status.step === "error" && (
        <div className="mt-2 rounded-[1.4rem] border border-soft bg-destructive-soft px-4 py-3 shadow-soft">
          <p className="text-sm font-medium text-destructive">{status.message}</p>
        </div>
      )}

      <div className="sticky bottom-0 mt-3 rounded-[1.75rem] border border-soft bg-[hsl(var(--surface-raised))/0.92] px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-card">
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
            Download ZIP
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
            Share
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
