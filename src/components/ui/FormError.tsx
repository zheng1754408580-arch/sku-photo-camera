"use client";

interface FormErrorProps {
  message?: string;
  className?: string;
}

export function FormError({ message, className = "" }: FormErrorProps) {
  if (!message) return null;

  return (
    <p className={`mt-2 text-sm font-medium text-destructive ${className}`}>
      {message}
    </p>
  );
}
