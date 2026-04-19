import { describe, it, expect, beforeEach } from "vitest";
import { isEnabled } from "@/lib/shared/feature-flags";

describe("isEnabled (feature flags)", () => {
  beforeEach(() => {
    // Reset any env stubs between tests
    for (const key of Object.keys(process.env).filter((k) => k.startsWith("FEATURE_FLAG_"))) {
      delete process.env[key];
    }
  });

  it("returns the default value when no env override is set", () => {
    expect(isEnabled("ragEnabled")).toBe(true);
    expect(isEnabled("billingEnabled")).toBe(false);
  });

  it("env override 'true' enables a flag that defaults off", () => {
    process.env.FEATURE_FLAG_BILLING_ENABLED = "true";
    expect(isEnabled("billingEnabled")).toBe(true);
  });

  it("env override '1' also enables a flag", () => {
    process.env.FEATURE_FLAG_BILLING_ENABLED = "1";
    expect(isEnabled("billingEnabled")).toBe(true);
  });

  it("env override 'false' disables a flag that defaults on", () => {
    process.env.FEATURE_FLAG_RAG_ENABLED = "false";
    expect(isEnabled("ragEnabled")).toBe(false);
  });

  it("any value other than 'true' or '1' disables the flag", () => {
    process.env.FEATURE_FLAG_RAG_ENABLED = "yes";
    expect(isEnabled("ragEnabled")).toBe(false);
  });

  it("urlIngestionEnabled defaults to true", () => {
    expect(isEnabled("urlIngestionEnabled")).toBe(true);
  });

  it("ocrEnabled defaults to true", () => {
    expect(isEnabled("ocrEnabled")).toBe(true);
  });

  it("multiGatewayBilling defaults to false", () => {
    expect(isEnabled("multiGatewayBilling")).toBe(false);
  });
});
