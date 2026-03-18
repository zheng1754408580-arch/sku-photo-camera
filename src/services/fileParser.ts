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
      `Unsupported file type: ${file.name}. Please choose a .xlsx, .xls, or .csv file.`,
    );
  }
}

export function pickFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = getAcceptString();
    input.style.display = "none";

    let settled = false;

    const cleanup = () => {
      input.removeEventListener("change", handleChange);
      input.removeEventListener("cancel", handleCancel);
      window.removeEventListener("focus", handleFocus);
      try {
        document.body.removeChild(input);
      } catch {}
    };

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const handleChange = () => {
      const file = input.files?.[0];
      settle(() => {
        if (!file) {
          reject(new FileParseError("USER_CANCELLED", "No file selected."));
          return;
        }
        resolve(file);
      });
    };

    const handleCancel = () => {
      settle(() => {
        reject(new FileParseError("USER_CANCELLED", ""));
      });
    };

    const handleFocus = () => {
      window.setTimeout(() => {
        if (settled) return;
        if (input.files?.length) return;
        settle(() => {
          reject(new FileParseError("USER_CANCELLED", ""));
        });
      }, 1000);
    };

    input.addEventListener("change", handleChange);
    input.addEventListener("cancel", handleCancel);
    window.addEventListener("focus", handleFocus, { once: true });

    document.body.appendChild(input);
    input.click();
  });
}

export async function parseFile(file: File): Promise<string[]> {
  validateFileType(file);

  if (file.size === 0) {
    throw new FileParseError("EMPTY_FILE", "The file is empty. Please choose a file that contains SKU data.");
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new FileParseError("NO_DATA", "No worksheet was found in the file.");
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
    }) as unknown[][];

    if (!rows || rows.length === 0) {
      throw new FileParseError("NO_DATA", "The worksheet is empty. No data was found.");
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
        "No valid SKU data was found. Make sure the first column contains SKU codes.",
      );
    }

    return skuList;
  } catch (err) {
    if (err instanceof FileParseError) throw err;
    throw new FileParseError(
      "PARSE_FAILED",
      `Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`,
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
