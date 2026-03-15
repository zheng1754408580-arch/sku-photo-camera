"use client";

import type { HTMLAttributes, ReactNode } from "react";

interface SurfaceCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function SurfaceCard({
  className = "",
  children,
  ...props
}: SurfaceCardProps) {
  return (
    <div
      className={`rounded-[2rem] border border-soft bg-card text-card-foreground shadow-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
