"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSkuStore } from "@/store/skuStore";
import { usePhotoStore } from "@/store/photoStore";
import { exportAsZip, sharePhotos, type ExportProgress } from "@/services/exportService";

type ExportStatus =
  | { step: "idle" }
  | { step: "exporting"; progress: ExportProgress }
  | { step: "done"; method: string }
  | { step: "error"; message: string };

export default function ExportPage() {
  const { skuList } = useSkuStore();
  const { photos, getPhotoCount } = usePhotoStore();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<ExportStatus>({ step: "idle" });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  const skusWithPhotos = useMemo(() => skuList.filter((sku) => (photos[sku]?.length ?? 0) > 0), [skuList, photos]);

  useEffect(() => {
    if (hydrated && skusWithPhotos.length > 0 && selected.size === 0) setSelected(new Set(skusWithPhotos));
  }, [hydrated, skusWithPhotos, selected.size]);

  const totalSelected = useMemo(() => Array.from(selected).reduce((sum, sku) => sum + (photos[sku]?.length ?? 0), 0), [selected, photos]);

  const toggleSku = useCallback((sku: string) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(sku)) next.delete(sku); else next.add(sku); return next; });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(selected.size === skusWithPhotos.length ? new Set() : new Set(skusWithPhotos));
  }, [selected.size, skusWithPhotos]);

  const handleExportZip = useCallback(async () => {
    if (selected.size === 0) return;
    setStatus({ step: "exporting", progress: { current: 0, total: 1, currentSku: "" } });
    try {
      await exportAsZip(photos, Array.from(selected), (p) => setStatus({ step: "exporting", progress: p }));
      setStatus({ step: "done", method: "ZIP 下载" });
    } catch (err) { setStatus({ step: "error", message: err instanceof Error ? err.message : "导出失败" }); }
  }, [selected, photos]);

  const handleShare = useCallback(async () => {
    if (selected.size === 0) return;
    setStatus({ step: "exporting", progress: { current: 0, total: 1, currentSku: "" } });
    try {
      await sharePhotos(photos, Array.from(selected), (p) => setStatus({ step: "exporting", progress: p }));
      setStatus({ step: "done", method: "分享" });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") { setStatus({ step: "idle" }); return; }
      setStatus({ step: "error", message: err instanceof Error ? err.message : "分享失败" });
    }
  }, [selected, photos]);

  if (!hydrated) return <div className="flex min-h-[calc(100dvh-3rem)] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" /></div>;

  if (skusWithPhotos.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center px-6">
        <p className="text-sm text-gray-500">暂无照片可导出</p>
        <p className="mt-1 text-xs text-gray-400">请先拍摄照片后再进行导出</p>
      </div>
    );
  }

  const allSelected = selected.size === skusWithPhotos.length;
  const progressPercent = status.step === "exporting" && status.progress.total > 0 ? (status.progress.current / status.progress.total) * 100 : 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-lg flex-col">
      <div className="border-b border-gray-100 bg-white px-4 py-4">
        <h2 className="mb-1 text-lg font-bold">导出照片</h2>
        <p className="text-sm text-gray-500">共 {skusWithPhotos.length} 个 SKU 有照片，已选 {selected.size} 个（{totalSelected} 张）</p>
      </div>

      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <button onClick={toggleAll} className="text-sm font-medium text-blue-500">{allSelected ? "取消全选" : "全选"}</button>
        <span className="text-xs text-gray-400">{selected.size} / {skusWithPhotos.length} 已选</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {skusWithPhotos.map((sku) => {
          const count = getPhotoCount(sku);
          const checked = selected.has(sku);
          return (
            <button key={sku} onClick={() => toggleSku(sku)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-gray-50 active:bg-gray-100">
              <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${checked ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"}`}>
                {checked && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{sku}</span>
              <span className="text-xs text-gray-400">{count} 张</span>
            </button>
          );
        })}
      </div>

      {status.step === "exporting" && (
        <div className="border-t border-gray-100 bg-white px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-blue-600">导出中… {status.progress.currentSku}</span>
            <span className="text-xs text-gray-400">{status.progress.current} / {status.progress.total}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-blue-500 transition-all duration-200" style={{ width: `${progressPercent}%` }} /></div>
        </div>
      )}

      {status.step === "done" && (
        <div className="border-t border-gray-100 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
            <span className="text-sm font-medium text-green-700">{status.method}完成！</span>
          </div>
        </div>
      )}

      {status.step === "error" && (
        <div className="border-t border-gray-100 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{status.message}</p>
        </div>
      )}

      <div className="border-t border-gray-200 bg-white px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="flex gap-3">
          <button onClick={handleExportZip} disabled={selected.size === 0 || status.step === "exporting"} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            下载 ZIP
          </button>
          <button onClick={handleShare} disabled={selected.size === 0 || status.step === "exporting"} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-500 px-4 py-3 text-sm font-semibold text-blue-500 transition hover:bg-blue-50 active:scale-[0.98] disabled:opacity-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" /></svg>
            分享
          </button>
        </div>
      </div>
    </div>
  );
}
