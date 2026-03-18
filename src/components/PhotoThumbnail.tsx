"use client";

import { memo, useState, useCallback, useRef } from "react";
import Image from "next/image";

interface PhotoThumbnailProps {
  uri: string;
  fileName: string;
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

const LONG_PRESS_MS = 500;

export const PhotoThumbnail = memo(function PhotoThumbnail({ uri, fileName, selected, onClick, onDelete }: PhotoThumbnailProps) {
  const [showMenu, setShowMenu] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (onDelete) setShowMenu(true);
  }, [onDelete]);

  const handleTouchStart = useCallback(() => {
    longPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      if (onDelete) setShowMenu(true);
    }, LONG_PRESS_MS);
  }, [onDelete]);

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!longPressedRef.current) onClick?.();
  }, [onClick]);

  const handleTouchMove = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  return (
    <>
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd(); }}
        onTouchMove={handleTouchMove}
        className={`group relative flex-shrink-0 overflow-hidden rounded-lg transition ${selected ? "ring-2 ring-blue-500 ring-offset-1" : "ring-1 ring-white/20"}`}
      >
        <Image src={uri} alt={fileName} width={56} height={56} className="h-14 w-14 object-cover" unoptimized />
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-center text-[9px] text-white">
          {fileName.replace(".jpg", "")}
        </span>
      </button>

      {showMenu && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6" onClick={() => setShowMenu(false)}>
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-1 text-center text-sm font-bold text-gray-900">Delete Photo</p>
            <p className="mb-5 text-center text-xs text-gray-500">Are you sure you want to delete {fileName}?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowMenu(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={() => { setShowMenu(false); onDelete?.(); }} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
