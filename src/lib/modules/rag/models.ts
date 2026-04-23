import "server-only";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { ModelId } from "./types";
import { MODEL_DEFINITIONS } from "./model-definitions";

export {
  MODEL_DEFINITIONS,
  FREE_MODELS,
  PRO_MODELS,
  getAvailableModels,
  isModelAllowed,
} from "./model-definitions";
export type { ModelDefinition } from "./model-definitions";

export function selectLanguageModel(modelId: ModelId): LanguageModel {
  switch (modelId) {
    case "gpt-4o-mini":
      return openai("gpt-4o-mini");
    case "gpt-4o":
      return openai("gpt-4o");
    case "claude-haiku-4-5":
      return anthropic("claude-haiku-4-5-20251001");
    case "claude-sonnet-4-6":
      return anthropic("claude-sonnet-4-6");
    default:
      return openai("gpt-4o-mini");
  }
}

export function estimateCostUsd(
  modelId: ModelId,
  inputTokens: number,
  outputTokens: number,
): number {
  const def = MODEL_DEFINITIONS.find((m) => m.id === modelId);
  if (!def) return 0;
  return inputTokens * def.costPerInputToken + outputTokens * def.costPerOutputToken;
}
