import * as XLSX from "xlsx";

export class FileParseError extends Error {
  constructor(
    public code:
      | "INVALID_TYPE"
      | "EMPTY_FILE"
      | "PARSE_FAILED"
      | "NO_DATA"
      | "USER_CANCELLED",
    message: string,
  ) {
    super(message);
    this.name = "FileParseError";
  }
}

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const ACCEPTED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
];

function getAcceptString(): string {
  return [...ACCEPTED_EXTENSIONS, ...ACCEPTED_MIME_TYPES].join(",");
}

function validateFileType(file: File): void {
  const name = file.name.toLowerCase();
  const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!hasValidExt) {
    throw new FileParseError(
      "INVALID_TYPE",
      `不支持的文件格式: ${file.name}。请选择 .xlsx、.xls 或 .csv 文件`,
    );
  }
}

export function pickFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = getAcceptString();
    input.style.display = "none";

    let picked = false;

    input.addEventListener("change", () => {
      picked = true;
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) {
        reject(new FileParseError("USER_CANCELLED", "未选择文件"));
        return;
      }
      resolve(file);
    });

    input.addEventListener("cancel", () => {
      picked = true;
      document.body.removeChild(input);
      reject(new FileParseError("USER_CANCELLED", ""));
    });

    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (!picked) {
            try { document.body.removeChild(input); } catch {}
            reject(new FileParseError("USER_CANCELLED", ""));
          }
        }, 500);
      },
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
}

export async function parseFile(file: File): Promise<string[]> {
  validateFileType(file);

  if (file.size === 0) {
    throw new FileParseError("EMPTY_FILE", "文件为空，请选择包含 SKU 数据的文件");
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new FileParseError("NO_DATA", "文件中没有找到工作表");
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
    }) as unknown[][];

    if (!rows || rows.length === 0) {
      throw new FileParseError("NO_DATA", "工作表为空，没有找到数据");
    }

    const skuList: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const cell = row[0];
      if (cell === null || cell === undefined) continue;

      const value = String(cell).trim();
      if (!value) continue;

      if (i === 0 && isHeaderRow(value)) continue;

      const upper = value.toUpperCase();
      if (!seen.has(upper)) {
        seen.add(upper);
        skuList.push(value);
      }
    }

    if (skuList.length === 0) {
      throw new FileParseError(
        "NO_DATA",
        "未找到有效的 SKU 数据，请确保第一列包含 SKU 编码",
      );
    }

    return skuList;
  } catch (err) {
    if (err instanceof FileParseError) throw err;
    throw new FileParseError(
      "PARSE_FAILED",
      `文件解析失败: ${err instanceof Error ? err.message : "未知错误"}`,
    );
  }
}

export async function pickAndParseSkuFile(): Promise<string[]> {
  const file = await pickFile();
  return parseFile(file);
}

const HEADER_KEYWORDS = [
  "sku", "编号", "编码", "货号", "商品编号", "product",
  "code", "item", "序号", "no", "number",
];

function isHeaderRow(value: string): boolean {
  const lower = value.toLowerCase();
  return HEADER_KEYWORDS.some((kw) => lower === kw || lower.includes(kw));
}
