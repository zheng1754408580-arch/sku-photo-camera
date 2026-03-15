"use client";

import type { InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function TextInput({
  error = false,
  className = "",
  type = "text",
  ...props
}: TextInputProps) {
  return (
    <input
      type={type}
      className={`flex h-12 w-full rounded-pill border bg-surface-raised px-5 py-3 text-[15px] font-medium text-foreground shadow-soft transition-all duration-200 placeholder:text-muted-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:cursor-not-allowed disabled:opacity-50 ${
        error
          ? "border-destructive bg-[hsl(var(--destructive-soft))] focus-visible:ring-[hsl(var(--destructive))]"
          : "border-input hover:border-[hsl(var(--ring))/0.32] focus-visible:ring-[hsl(var(--ring))]"
      } ${className}`}
      {...props}
    />
  );
}
