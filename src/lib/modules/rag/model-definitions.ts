// Client-safe: no SDK imports, pure data + types
import type { ModelId, ModelTier } from "./types";

export type ModelDefinition = {
  id: ModelId;
  label: string;
  provider: "openai" | "anthropic";
  tier: ModelTier;
  costPerInputToken: number;
  costPerOutputToken: number;
};

export const MODEL_DEFINITIONS: ModelDefinition[] = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai",
    tier: "FREE",
    costPerInputToken: 0.00000015,
    costPerOutputToken: 0.0000006,
  },
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku",
    provider: "anthropic",
    tier: "FREE",
    costPerInputToken: 0.0000008,
    costPerOutputToken: 0.000004,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    tier: "PRO",
    costPerInputToken: 0.0000025,
    costPerOutputToken: 0.00001,
  },
  {
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet",
    provider: "anthropic",
    tier: "PRO",
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
  },
];

export const FREE_MODELS = MODEL_DEFINITIONS.filter((m) => m.tier === "FREE");
export const PRO_MODELS = MODEL_DEFINITIONS;

export function getAvailableModels(tier: ModelTier): ModelDefinition[] {
  return tier === "PRO" ? PRO_MODELS : FREE_MODELS;
}

export function isModelAllowed(modelId: ModelId, tier: ModelTier): boolean {
  const def = MODEL_DEFINITIONS.find((m) => m.id === modelId);
  if (!def) return false;
  if (def.tier === "FREE") return true;
  return tier === "PRO";
}
