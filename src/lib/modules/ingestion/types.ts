export interface ExtractionResult {
  text: string;
  pageCount: number | null;
  wordCount: number;
  usedOcr: boolean;
}

export interface ChunkWithMeta {
  content: string;
  contentHash: string;
  tokenCount: number;
  chunkIndex: number;
  pageNumber?: number;
  metadata: Record<string, unknown>;
}

export interface EmbeddedChunk extends ChunkWithMeta {
  embedding: number[];
}

export interface IngestionProgress {
  sourceId: string;
  status: IngestionStatus;
  message?: string;
  progress?: number; // 0-100
}

export type IngestionStatus =
  | "PENDING"
  | "EXTRACTING"
  | "OCR_RUNNING"
  | "CHUNKING"
  | "EMBEDDING"
  | "INDEXED"
  | "FAILED";
