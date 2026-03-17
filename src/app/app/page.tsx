"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { useSkuStore } from "@/store/skuStore";

export default function AppHomePage() {
  const router = useRouter();
  const { hasData } = useSkuStore();

  return (
    <div className="app-page flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-1 flex-col">
        <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-background">
          <img
            src="/brand/upload-file-bg.png"
            alt="Upload file background illustration"
            className="pointer-events-none absolute inset-0 h-full w-full object-contain object-top"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(248,245,238,0.02),rgba(248,245,238,0.04)_45%,rgba(248,245,238,0.28)_68%,rgba(248,245,238,0.78)_84%,rgba(248,245,238,0.96)_100%)]" />

          <div className="relative flex flex-1 flex-col justify-end px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6">
            <SurfaceCard className="w-full rounded-[2rem] px-5 py-5 shadow-soft">
              <Button onClick={() => router.push("/app/sku-list")} fullWidth>
                Upload File
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {hasData()
                  ? "You can re-upload from the list page anytime."
                  : "Start by uploading your latest file."}
              </p>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </div>
  );
}
