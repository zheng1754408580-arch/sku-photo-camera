"use client";

import type { LabelHTMLAttributes, ReactNode } from "react";

interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: ReactNode;
}

export function FormLabel({
  required = false,
  className = "",
  children,
  ...props
}: FormLabelProps) {
  return (
    <label
      className={`mb-2 block text-[13px] font-semibold tracking-[-0.01em] text-foreground ${className}`}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-destructive">*</span>}
    </label>
  );
}
