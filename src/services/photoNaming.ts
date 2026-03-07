export function generatePhotoFileName(
  skuCode: string,
  sequence: number,
): string {
  const seq = String(sequence).padStart(2, "0");
  const sanitized = skuCode.replace(/[/\\:*?"<>|]/g, "_");
  return `${sanitized}-${seq}.jpg`;
}

export function extractSequenceFromFileName(fileName: string): number {
  const match = fileName.match(/-(\d+)\.jpg$/);
  return match ? parseInt(match[1], 10) : 0;
}
