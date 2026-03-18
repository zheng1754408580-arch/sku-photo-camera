"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSkuStore } from "@/store/skuStore";
import { usePhotoStore } from "@/store/photoStore";
import { useFittingSessionStore } from "@/store/fittingSessionStore";
import { SKUItem } from "@/components/SKUItem";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { TextInput } from "@/components/ui/TextInput";
import { pickFile, parseFile, FileParseError } from "@/services/fileParser";

export default function SKUListPage() {
  const router = useRouter();
  const { skuList, selectedSku, selectSku, setSkuList, clear: clearSku } = useSkuStore();
  const { photos, getPhotoCount, getTotalPhotoCount, clearAll: clearPhotos } = usePhotoStore();
  const {
    getPhotoCountForStyle,
    getTotalPhotoCount: getFittingTotalPhotoCount,
    clearAll: clearFittingSessions,
  } = useFittingSessionStore();

  const [search, setSearch] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => { setHydrated(true); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return skuList;
    const kw = search.trim().toLowerCase();
    return skuList.filter((sku) => sku.toLowerCase().includes(kw));
  }, [skuList, search]);

  const completedCount = useMemo(
    () =>
      skuList.filter(
        (sku) => (photos[sku]?.length ?? 0) + getPhotoCountForStyle(sku) > 0,
      ).length,
    [skuList, photos, getPhotoCountForStyle],
  );

  const totalPhotos = useMemo(
    () => getTotalPhotoCount() + getFittingTotalPhotoCount(),
    [getFittingTotalPhotoCount, getTotalPhotoCount],
  );
  const progress = skuList.length > 0 ? completedCount / skuList.length : 0;

  const handleSelect = useCallback((sku: string) => { selectSku(sku); router.push("/app/camera"); }, [selectSku, router]);

  const handleReupload = useCallback(async () => {
    setError("");
    setNotice("");
    setUploading(true);
    try {
      const file = await pickFile();
      const list = await parseFile(file);
      setSkuList(list);
      setSearch("");
      setNotice(`${list.length} SKUs recognized`);
    } catch (err) {
      if (err instanceof FileParseError && err.code === "USER_CANCELLED") {
        return;
      }
      console.error("Failed to re-upload SKU file", err);
      setError(err instanceof FileParseError ? err.message : "Failed to parse the file. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [setSkuList]);

  const handleStartShooting = useCallback(() => {
    const targetSku = selectedSku ?? filtered[0] ?? skuList[0];
    if (!targetSku) {
      setError("Please upload a file first.");
      return;
    }
    selectSku(targetSku);
    router.push("/app/camera");
  }, [filtered, router, selectSku, selectedSku, skuList]);

  const handleClearAll = useCallback(() => {
    clearSku();
    clearPhotos();
    clearFittingSessions();
    setShowClearConfirm(false);
    router.push("/app");
  }, [clearFittingSessions, clearSku, clearPhotos, router]);

  if (!hydrated) {
    return <div className="flex min-h-dvh items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-input border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-[430px] flex-col px-4 pb-4 pt-4">
      <div className="app-panel mb-3 px-4 py-4">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">SKU List</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="section-title text-lg text-foreground">Completed {completedCount} / {skuList.length}</span>
            <span className="text-xs tracking-[0.01em] text-muted-foreground">{totalPhotos} photos total</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <TextInput type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU…" className="h-10 py-2 pl-9 pr-10 text-sm" />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <Link href="/app/export" className="flex h-10 items-center gap-1 rounded-pill border border-soft bg-surface-raised px-3 text-sm font-semibold text-foreground shadow-soft transition hover:bg-secondary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
            Export
          </Link>
          <button onClick={() => setShowClearConfirm(true)} className="flex h-10 items-center gap-1 rounded-pill border border-[hsl(var(--destructive))/0.2] bg-[hsl(var(--destructive-soft))] px-3 text-sm font-semibold text-destructive transition hover:brightness-[0.99]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1">
        {(error || notice) && (
          <div className="mb-3">
            {error && <div className="status-note status-note-danger">{error}</div>}
            {!error && notice && <div className="status-note status-note-success">{notice}</div>}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">
              {skuList.length === 0
                ? "No SKU data yet. Please upload a file first."
                : search
                  ? `No SKU matched “${search}”`
                  : "No data available"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 pb-28">
            {filtered.map((sku, i) => (
              <SKUItem
                key={sku}
                index={i + 1}
                code={sku}
                photoCount={getPhotoCount(sku) + getPhotoCountForStyle(sku)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-20 mt-3 rounded-[1.75rem] border border-soft bg-[hsl(var(--surface-raised))/0.94] px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-card backdrop-blur-xl">
        <div className="flex gap-3">
          <Button
            onClick={handleReupload}
            variant="secondary"
            fullWidth
            loading={uploading}
          >
            Re-upload
          </Button>
          <Button
            onClick={handleStartShooting}
            fullWidth
            disabled={skuList.length === 0}
          >
            Start Shooting
          </Button>
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground))/0.22] px-6 backdrop-blur-sm">
          <SurfaceCard className="w-full max-w-xs p-6">
            <h3 className="section-title mb-2 text-center text-base">Clear all data?</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">This will delete the entire SKU list and all captured photo data. This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowClearConfirm(false)} variant="secondary" fullWidth>Cancel</Button>
              <Button onClick={handleClearAll} variant="destructive" fullWidth>Clear Everything</Button>
            </div>
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
