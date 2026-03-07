"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSkuStore } from "@/store/skuStore";
import { usePhotoStore } from "@/store/photoStore";
import { SKUItem } from "@/components/SKUItem";

export default function SKUListPage() {
  const router = useRouter();
  const { skuList, selectSku, clear: clearSku } = useSkuStore();
  const { photos, getPhotoCount, getTotalPhotoCount, clearAll: clearPhotos } = usePhotoStore();

  const [search, setSearch] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return skuList;
    const kw = search.trim().toLowerCase();
    return skuList.filter((sku) => sku.toLowerCase().includes(kw));
  }, [skuList, search]);

  const completedCount = useMemo(
    () => skuList.filter((sku) => (photos[sku]?.length ?? 0) > 0).length,
    [skuList, photos],
  );

  const totalPhotos = useMemo(() => getTotalPhotoCount(), [photos, getTotalPhotoCount]);
  const progress = skuList.length > 0 ? completedCount / skuList.length : 0;

  const handleSelect = useCallback((sku: string) => { selectSku(sku); router.push("/app/camera"); }, [selectSku, router]);

  const handleClearAll = useCallback(() => {
    clearSku(); clearPhotos(); setShowClearConfirm(false); router.push("/app");
  }, [clearSku, clearPhotos, router]);

  if (!hydrated) {
    return <div className="flex min-h-dvh items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" /></div>;
  }

  if (skuList.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center px-6">
        <p className="mb-4 text-sm text-gray-500">暂无 SKU 数据</p>
        <Link href="/app" className="rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600">去上传文件</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-lg flex-col">
      <div className="sticky top-12 z-30 border-b border-gray-100 bg-white/90 px-4 pb-3 pt-4 backdrop-blur-lg">
        <div className="mb-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-gray-900">已完成 {completedCount} / {skuList.length}</span>
            <span className="text-xs text-gray-400">共 {totalPhotos} 张照片</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索 SKU…" className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:text-gray-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <Link href="/app/export" className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
            导出
          </Link>
          <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
            清除
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-gray-400">{search ? `未找到匹配「${search}」的 SKU` : "暂无数据"}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((sku, i) => (
              <SKUItem key={sku} index={i + 1} code={sku} photoCount={getPhotoCount(sku)} onSelect={handleSelect} />
            ))}
          </div>
        )}
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-center text-base font-bold">清除所有数据？</h3>
            <p className="mb-6 text-center text-sm text-gray-500">将删除所有 SKU 列表和已拍照片数据，此操作不可恢复。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50">取消</button>
              <button onClick={handleClearAll} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600">确认清除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
