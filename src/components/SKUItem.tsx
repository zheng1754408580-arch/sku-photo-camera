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
      className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-left transition active:scale-[0.99] hover:bg-gray-50"
    >
      <span className="w-7 flex-shrink-0 text-center text-xs font-medium text-gray-400">{index}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{code}</span>
      <span className={`text-xs font-medium ${done ? "text-green-600" : "text-gray-400"}`}>{photoCount} 张</span>
      <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${done ? "bg-green-100" : "bg-gray-100"}`}>
        {done ? (
          <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <div className="h-2 w-2 rounded-full bg-gray-300" />
        )}
      </div>
      <svg className="h-4 w-4 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  );
});
