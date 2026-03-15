import JSZip from "jszip";
import { saveAs } from "file-saver";

export interface ExportablePhotoItem {
  uri: string;
  fileName: string;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export interface ExportProgress {
  current: number;
  total: number;
  currentSku: string;
}

export async function exportAsZip(
  photosMap: Record<string, ExportablePhotoItem[]>,
  selectedSkus: string[],
  onProgress?: (p: ExportProgress) => void,
): Promise<void> {
  const zip = new JSZip();
  let current = 0;
  let total = 0;
  for (const sku of selectedSkus) total += photosMap[sku]?.length ?? 0;
  if (total === 0) throw new Error("没有可导出的照片");

  for (const sku of selectedSkus) {
    const items = photosMap[sku] ?? [];
    const folder = zip.folder(sku)!;
    for (const item of items) {
      folder.file(item.fileName, dataUrlToBlob(item.uri));
      current++;
      onProgress?.({ current, total, currentSku: sku });
    }
  }

  const content = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (meta) => onProgress?.({ current: Math.round((meta.percent / 100) * total), total, currentSku: "压缩中…" }),
  );

  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  saveAs(content, `SKU_Photos_${ts}.zip`);
}

export async function sharePhotos(
  photosMap: Record<string, ExportablePhotoItem[]>,
  selectedSkus: string[],
  onProgress?: (p: ExportProgress) => void,
): Promise<void> {
  const files: File[] = [];
  let current = 0;
  let total = 0;
  for (const sku of selectedSkus) total += photosMap[sku]?.length ?? 0;
  if (total === 0) throw new Error("没有可分享的照片");

  for (const sku of selectedSkus) {
    const items = photosMap[sku] ?? [];
    for (const item of items) {
      files.push(new File([dataUrlToBlob(item.uri)], item.fileName, { type: "image/jpeg" }));
      current++;
      onProgress?.({ current, total, currentSku: sku });
    }
  }

  if (navigator.canShare && navigator.canShare({ files })) {
    await navigator.share({ files, title: "SKU 照片" });
  } else {
    await exportAsZip(photosMap, selectedSkus, onProgress);
  }
}
