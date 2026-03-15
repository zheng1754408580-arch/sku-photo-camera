"use client";

import type { TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function TextArea({
  error = false,
  className = "",
  ...props
}: TextAreaProps) {
  return (
    <textarea
      className={`flex min-h-28 w-full rounded-[1.4rem] border bg-surface-raised px-5 py-3.5 text-[15px] font-medium text-foreground shadow-soft transition-all duration-200 placeholder:text-muted-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))] disabled:cursor-not-allowed disabled:opacity-50 ${
        error
          ? "border-destructive bg-[hsl(var(--destructive-soft))] focus-visible:ring-[hsl(var(--destructive))]"
          : "border-input hover:border-[hsl(var(--ring))/0.32] focus-visible:ring-[hsl(var(--ring))]"
      } ${className}`}
      {...props}
    />
  );
}
