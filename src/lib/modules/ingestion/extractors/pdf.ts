import "server-only";
import type { ExtractionResult } from "../types";

export async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  // Dynamic import avoids pdf-parse's test-file side-effect at module load time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (
    buf: Buffer,
  ) => Promise<{ text: string; numpages: number }>;
  const data = await pdfParse(buffer);

  const pageTexts: string[] = [];
  let totalChars = 0;

  // Split by form-feed character (page separator emitted by pdf-parse)
  const pages = data.text.split("\f");
  for (const page of pages) {
    const trimmed = page.trim();
    pageTexts.push(trimmed);
    totalChars += trimmed.length;
  }

  const pageCount = pageTexts.length || data.numpages;
  const avgCharsPerPage = pageCount > 0 ? totalChars / pageCount : 0;
  const needsOcr = avgCharsPerPage < 100;

  if (needsOcr) {
    const ocr = await runOcr(buffer);
    return { text: ocr, pageCount, wordCount: countWords(ocr), usedOcr: true };
  }

  const text = pageTexts.join("\n\n");
  return { text, pageCount, wordCount: countWords(text), usedOcr: false };
}

async function runOcr(buffer: Buffer): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text;
  } finally {
    await worker.terminate();
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
