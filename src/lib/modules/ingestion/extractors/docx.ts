import "server-only";
import type { ExtractionResult } from "../types";

export async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });

  const text = result.value.trim();
  return {
    text,
    pageCount: null,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    usedOcr: false,
  };
}
