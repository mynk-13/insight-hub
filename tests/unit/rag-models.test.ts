import { describe, it, expect } from "vitest";
import {
  getAvailableModels,
  isModelAllowed,
  estimateCostUsd,
  FREE_MODELS,
  PRO_MODELS,
} from "@/lib/modules/rag/models";

describe("getAvailableModels", () => {
  it("free tier returns only free models", () => {
    const models = getAvailableModels("FREE");
    expect(models.every((m) => m.tier === "FREE")).toBe(true);
  });

  it("pro tier returns all models including free ones", () => {
    const models = getAvailableModels("PRO");
    expect(models.length).toBeGreaterThanOrEqual(FREE_MODELS.length);
    expect(models.length).toBe(PRO_MODELS.length);
  });

  it("free models include gpt-4o-mini", () => {
    const ids = FREE_MODELS.map((m) => m.id);
    expect(ids).toContain("gpt-4o-mini");
  });

  it("pro models include gpt-4o and claude-sonnet-4-6", () => {
    const ids = PRO_MODELS.map((m) => m.id);
    expect(ids).toContain("gpt-4o");
    expect(ids).toContain("claude-sonnet-4-6");
  });
});

describe("isModelAllowed", () => {
  it("free model is allowed on free tier", () => {
    expect(isModelAllowed("gpt-4o-mini", "FREE")).toBe(true);
  });

  it("pro model is not allowed on free tier", () => {
    expect(isModelAllowed("gpt-4o", "FREE")).toBe(false);
    expect(isModelAllowed("claude-sonnet-4-6", "FREE")).toBe(false);
  });

  it("pro model is allowed on pro tier", () => {
    expect(isModelAllowed("gpt-4o", "PRO")).toBe(true);
    expect(isModelAllowed("claude-sonnet-4-6", "PRO")).toBe(true);
  });

  it("free model is allowed on pro tier", () => {
    expect(isModelAllowed("gpt-4o-mini", "PRO")).toBe(true);
  });

  it("unknown model returns false", () => {
    expect(isModelAllowed("unknown-model" as never, "PRO")).toBe(false);
  });
});

describe("estimateCostUsd", () => {
  it("returns 0 for unknown model", () => {
    expect(estimateCostUsd("unknown-model" as never, 1000, 500)).toBe(0);
  });

  it("calculates cost proportional to token counts", () => {
    const cost1 = estimateCostUsd("gpt-4o-mini", 1000, 500);
    const cost2 = estimateCostUsd("gpt-4o-mini", 2000, 1000);
    expect(cost2).toBeCloseTo(cost1 * 2, 10);
  });

  it("pro model costs more than free model per token", () => {
    const freeCost = estimateCostUsd("gpt-4o-mini", 1000, 500);
    const proCost = estimateCostUsd("gpt-4o", 1000, 500);
    expect(proCost).toBeGreaterThan(freeCost);
  });

  it("returns a positive number for valid inputs", () => {
    expect(estimateCostUsd("gpt-4o-mini", 500, 200)).toBeGreaterThan(0);
  });
});
