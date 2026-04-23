// Server-only exports (Node.js dependencies — never import in client components)
export { hybridRetrieve, reciprocalRankFusion } from "./retriever";
export { buildSystemPrompt, hasUsableChunks, NO_RESULTS_RESPONSE } from "./prompt";
export { selectLanguageModel, estimateCostUsd } from "./models";
export { checkChatRateLimit } from "./rate-limiter";

// Shared exports (client-safe: pure functions / types only)
export { parseCitationSegments, extractCitationIndices } from "./citation-parser";
export {
  getAvailableModels,
  isModelAllowed,
  MODEL_DEFINITIONS,
  FREE_MODELS,
  PRO_MODELS,
} from "./model-definitions";
export type { ModelDefinition } from "./model-definitions";
export type {
  RetrievedChunk,
  RankedChunk,
  Citation,
  ChatContext,
  ModelId,
  ModelTier,
  SseEvent,
} from "./types";
