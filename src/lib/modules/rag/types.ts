export type RetrievedChunk = {
  chunkId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string | null;
  content: string;
  score: number;
  pageNumber?: number;
  chunkIndex: number;
};

export type RankedChunk = {
  chunkId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string | null;
  content: string;
  rrfScore: number;
  topScore: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  pageNumber?: number;
  chunkIndex: number;
};

export type Citation = {
  index: number;
  chunkId: string;
  sourceId: string;
  sourceName: string;
  sourceUrl: string | null;
  content: string;
  pageNumber?: number;
};

export type ChatContext = {
  type: "WORKSPACE" | "COLLECTION" | "SOURCE";
  id?: string;
};

export type ModelId = "gpt-4o-mini" | "gpt-4o" | "claude-haiku-4-5" | "claude-sonnet-4-6";

export type ModelTier = "FREE" | "PRO";

export type SseEvent =
  | { type: "citations"; citations: Citation[] }
  | { type: "text"; text: string }
  | { type: "done"; messageId: string; assistantMessageId: string }
  | { type: "error"; message: string };
