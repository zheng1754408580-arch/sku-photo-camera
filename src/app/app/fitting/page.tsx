"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FittingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app/camera");
  }, [router]);

  return null;
}
