"use client";

import { useState, useRef, useEffect } from "react";
import type { PhotoItem } from "@/store/photoStore";

interface PhotoPreviewModalProps {
  photos: PhotoItem[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (fileName: string) => void;
}

export function PhotoPreviewModal({ photos, initialIndex, onClose, onDelete }: PhotoPreviewModalProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const photo = photos[current];

  useEffect(() => {
    if (current >= photos.length && photos.length > 0) setCurrent(photos.length - 1);
  }, [photos.length, current]);

  useEffect(() => {
    if (!photo || photos.length === 0) onClose();
  }, [photo, photos.length, onClose]);

  if (!photo || photos.length === 0) return null;

  const goTo = (idx: number) => { if (idx >= 0 && idx < photos.length) setCurrent(idx); };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchDeltaX.current = 0; setSwiping(true); };
  const handleTouchMove = (e: React.TouchEvent) => { const d = e.touches[0].clientX - touchStartX.current; touchDeltaX.current = d; setOffsetX(d); };
  const handleTouchEnd = () => {
    setSwiping(false);
    if (touchDeltaX.current < -60 && current < photos.length - 1) setCurrent(current + 1);
    else if (touchDeltaX.current > 60 && current > 0) setCurrent(current - 1);
    setOffsetX(0);
  };

  const handleDeleteCurrent = () => {
    onDelete(photo.fileName);
    setShowDeleteConfirm(false);
    if (photos.length <= 1) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="relative z-10 flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">关闭</button>
        <div className="text-center">
          <p className="text-sm font-medium text-white">{photo.fileName}</p>
          <p className="text-xs text-white/50">{current + 1} / {photos.length}</p>
        </div>
        <button onClick={() => setShowDeleteConfirm(true)} className="rounded-full bg-red-500/80 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">删除</button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {current > 0 && (
          <button onClick={() => goTo(current - 1)} className="absolute left-2 z-10 hidden rounded-full bg-black/40 p-2 text-white backdrop-blur-sm md:flex">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
        )}
        <div className="flex h-full w-full items-center justify-center p-4" style={{ transform: `translateX(${swiping ? offsetX : 0}px)`, transition: swiping ? "none" : "transform 0.2s ease-out" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.uri} alt={photo.fileName} className="max-h-full max-w-full select-none object-contain" draggable={false} />
        </div>
        {current < photos.length - 1 && (
          <button onClick={() => goTo(current + 1)} className="absolute right-2 z-10 hidden rounded-full bg-black/40 p-2 text-white backdrop-blur-sm md:flex">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          {photos.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} className={`h-1.5 rounded-full transition-all ${i === current ? "w-4 bg-white" : "w-1.5 bg-white/30"}`} />
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-6" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-1 text-center text-sm font-bold text-gray-900">删除照片</p>
            <p className="mb-5 text-center text-xs text-gray-500">确定要删除 {photo.fileName} 吗？此操作不可恢复。</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">取消</button>
              <button onClick={handleDeleteCurrent} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white">删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
