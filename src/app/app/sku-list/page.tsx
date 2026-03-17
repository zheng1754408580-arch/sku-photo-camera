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
  const { getPhotoCountForStyle, getTotalPhotoCount: getFittingTotalPhotoCount } = useFittingSessionStore();

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
    [getFittingTotalPhotoCount, getTotalPhotoCount, photos],
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
      setNotice(`已识别 ${list.length} 个 SKU`);
    } catch (err) {
      if (err instanceof FileParseError && err.code === "USER_CANCELLED") {
        return;
      }
      console.error("Failed to re-upload SKU file", err);
      setError(err instanceof FileParseError ? err.message : "文件解析失败，请重试");
    } finally {
      setUploading(false);
    }
  }, [setSkuList]);

  const handleStartShooting = useCallback(() => {
    const targetSku = selectedSku ?? filtered[0] ?? skuList[0];
    if (!targetSku) {
      setError("请先上传文件");
      return;
    }
    selectSku(targetSku);
    router.push("/app/camera");
  }, [filtered, router, selectSku, selectedSku, skuList]);

  const handleClearAll = useCallback(() => {
    clearSku(); clearPhotos(); setShowClearConfirm(false); router.push("/app");
  }, [clearSku, clearPhotos, router]);

  if (!hydrated) {
    return <div className="flex min-h-dvh items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-input border-t-primary" /></div>;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-lg flex-col">
      <div className="sticky top-12 z-30 border-b border-soft bg-[hsl(var(--surface-raised))/0.9] px-4 pb-3 pt-4 backdrop-blur-lg">
        <div className="mb-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground">已完成 {completedCount} / {skuList.length}</span>
            <span className="text-xs text-muted-foreground">共 {totalPhotos} 张照片</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <TextInput type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索 SKU…" className="h-10 py-2 pl-9 pr-10 text-sm" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition hover:text-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <Link href="/app/export" className="flex items-center gap-1 rounded-pill border border-soft bg-surface-raised px-3 py-2 text-sm font-semibold text-foreground shadow-soft transition hover:bg-secondary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
            导出
          </Link>
          <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1 rounded-pill border border-[hsl(var(--destructive))/0.2] bg-[hsl(var(--destructive-soft))] px-3 py-2 text-sm font-semibold text-destructive transition hover:brightness-[0.99]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            清除
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
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
                ? "暂无 SKU 数据，请先上传文件"
                : search
                  ? `未找到匹配「${search}」的 SKU`
                  : "暂无数据"}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 pb-28">
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

      <div className="sticky bottom-0 z-20 border-t border-soft bg-[hsl(var(--surface-raised))/0.94] px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)] backdrop-blur-lg">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <SurfaceCard className="w-full max-w-xs p-6">
            <h3 className="section-title mb-2 text-center text-base">清除所有数据？</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">将删除所有 SKU 列表和已拍照片数据，此操作不可恢复。</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowClearConfirm(false)} variant="secondary" fullWidth>取消</Button>
              <Button onClick={handleClearAll} variant="destructive" fullWidth>确认清除</Button>
            </div>
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
