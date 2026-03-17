"use client";

import { FittingSessionWorkspace } from "@/components/FittingSessionWorkspace";

export default function CameraPage() {
  return (
    <FittingSessionWorkspace
      promptForRound
      backPath="/app/sku-list"
      completePath="/app/export"
    />
  );
}
