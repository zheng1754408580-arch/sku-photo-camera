"use client";

import { memo } from "react";

interface SKUItemProps {
  index: number;
  code: string;
  photoCount: number;
  onSelect: (sku: string) => void;
}

export const SKUItem = memo(function SKUItem({ index, code, photoCount, onSelect }: SKUItemProps) {
  const done = photoCount > 0;

  return (
    <button
      onClick={() => onSelect(code)}
      className="flex w-full items-center gap-3 rounded-[1.35rem] border border-soft bg-surface-raised px-4 py-3.5 text-left shadow-soft transition hover:bg-secondary active:scale-[0.99]"
    >
      <span className="w-7 flex-shrink-0 text-center text-xs font-medium text-muted-foreground">{index}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{code}</span>
      <span className={`text-xs font-semibold ${done ? "text-success-foreground" : "text-muted-foreground"}`}>{photoCount} 张</span>
      <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${done ? "bg-success-soft text-success-foreground" : "bg-secondary text-muted-foreground"}`}>
        {done ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        )}
      </div>
      <svg className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  );
});
