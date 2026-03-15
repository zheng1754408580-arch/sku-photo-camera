interface FittingPhotoNameInput {
  styleNo: string;
  round: string;
  sequence: number;
  extension?: string;
}

function sanitizeNamePart(value: string): string {
  return value.replace(/[/\\:*?"<>|]/g, "_").trim();
}

function normalizeExtension(extension = "jpg"): string {
  return extension.replace(/^\./, "").toLowerCase() || "jpg";
}

export function generateLegacyPhotoFileName(
  skuCode: string,
  sequence: number,
  extension = "jpg",
): string {
  const seq = String(sequence).padStart(2, "0");
  const sanitized = sanitizeNamePart(skuCode);
  return `${sanitized}-${seq}.${normalizeExtension(extension)}`;
}

export function generateFittingPhotoFileName({
  styleNo,
  round,
  sequence,
  extension = "jpg",
}: FittingPhotoNameInput): string {
  const seq = String(sequence).padStart(3, "0");
  return `${sanitizeNamePart(styleNo)}_${sanitizeNamePart(round)}_${seq}.${normalizeExtension(extension)}`;
}

export function generatePhotoFileName(
  skuCodeOrInput: string | FittingPhotoNameInput,
  sequence?: number,
): string {
  if (typeof skuCodeOrInput === "string") {
    return generateLegacyPhotoFileName(skuCodeOrInput, sequence ?? 1);
  }
  return generateFittingPhotoFileName(skuCodeOrInput);
}

export function extractSequenceFromFileName(fileName: string): number {
  const match = fileName.match(/(?:-|_)(\d+)\.[^.]+$/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function getFileExtension(fileName: string, fallback = "jpg"): string {
  const ext = fileName.split(".").pop()?.trim();
  return ext ? normalizeExtension(ext) : normalizeExtension(fallback);
}
