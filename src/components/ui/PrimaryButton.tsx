"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

export function PrimaryButton({
  loading = false,
  fullWidth = false,
  children,
  ...props
}: PrimaryButtonProps) {
  return (
    <Button variant="primary" loading={loading} fullWidth={fullWidth} {...props}>
      {children}
    </Button>
  );
}
