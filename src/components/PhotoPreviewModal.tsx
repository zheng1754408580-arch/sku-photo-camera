"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
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
  const trackRef = useRef<HTMLDivElement>(null);

  const safeCurrent = photos.length === 0 ? -1 : Math.min(current, photos.length - 1);
  const photo = safeCurrent >= 0 ? photos[safeCurrent] : null;

  useEffect(() => {
    if (!photo || photos.length === 0) onClose();
  }, [photo, photos.length, onClose]);

  const resetTrackPosition = useCallback(() => {
    if (!trackRef.current) return;
    trackRef.current.style.transform = "translateX(0px)";
    trackRef.current.style.transition = "transform 0.2s ease-out";
  }, []);

  if (!photo || photos.length === 0) return null;

  const goTo = (idx: number) => { if (idx >= 0 && idx < photos.length) setCurrent(idx); };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    if (trackRef.current) {
      trackRef.current.style.transition = "none";
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const d = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = d;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${d}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (touchDeltaX.current < -60 && safeCurrent < photos.length - 1) {
      setCurrent((prev) => Math.min(prev + 1, photos.length - 1));
    } else if (touchDeltaX.current > 60 && safeCurrent > 0) {
      setCurrent((prev) => Math.max(prev - 1, 0));
    }
    resetTrackPosition();
  };

  const handleDeleteCurrent = () => {
    onDelete(photo.fileName);
    setShowDeleteConfirm(false);
    if (photos.length <= 1) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col app-dark-stage app-overlay-text">
      <div className="relative z-10 flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          onClick={onClose}
          className="min-h-11 min-w-11 rounded-pill app-overlay-chip px-4 py-2 text-sm font-medium transition hover:brightness-110"
        >
          Close
        </button>
        <div className="min-w-0 flex-1 px-3 text-center">
          <p className="truncate text-sm font-medium app-overlay-text">{photo.fileName}</p>
          <p className="text-xs app-overlay-muted">{safeCurrent + 1} / {photos.length}</p>
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="min-h-11 min-w-11 rounded-pill border border-[hsl(var(--destructive))/0.18] bg-[hsl(var(--destructive-soft))] px-4 py-2 text-sm font-medium text-destructive shadow-soft transition hover:brightness-[0.99]"
        >
          Delete
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {safeCurrent > 0 && (
          <button onClick={() => goTo(safeCurrent - 1)} className="absolute left-2 z-10 hidden min-h-11 min-w-11 items-center justify-center rounded-pill app-overlay-chip p-2 md:flex">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
        )}
        <div ref={trackRef} className="flex h-full w-full items-center justify-center p-4 will-change-transform">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.uri} alt={photo.fileName} className="max-h-full max-w-full select-none object-contain" draggable={false} decoding="async" />
        </div>
        {safeCurrent < photos.length - 1 && (
          <button onClick={() => goTo(safeCurrent + 1)} className="absolute right-2 z-10 hidden min-h-11 min-w-11 items-center justify-center rounded-pill app-overlay-chip p-2 md:flex">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`View photo ${i + 1}`}
              className="flex min-h-11 min-w-11 items-center justify-center"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${i === safeCurrent ? "w-4 bg-[hsl(var(--surface-raised))]" : "w-1.5 bg-[hsl(var(--surface-raised))/0.32]"}`}
              />
            </button>
          ))}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[hsl(var(--foreground))/0.22] px-6 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <SurfaceCard className="w-full max-w-xs p-5" onClick={(e) => e.stopPropagation()}>
            <p className="section-title mb-1 text-center text-sm">Delete Photo</p>
            <p className="mb-5 text-center text-xs text-muted-foreground">Are you sure you want to delete {photo.fileName}? This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowDeleteConfirm(false)} variant="secondary" fullWidth>Cancel</Button>
              <Button onClick={handleDeleteCurrent} variant="destructive" fullWidth>Delete</Button>
            </div>
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
