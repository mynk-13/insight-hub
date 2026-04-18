import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/shared/logger";

describe("logger", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a structured JSON entry", () => {
    logger.info("test message");
    expect(consoleSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("test message");
    expect(entry.timestamp).toBeTruthy();
  });

  it("redacts email addresses from messages", () => {
    logger.info("user logged in: user@example.com");
    const entry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(entry.message).not.toContain("user@example.com");
    expect(entry.message).toContain("[REDACTED]");
  });

  it("redacts password fields from context", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("auth failure", { password: "secret123" });
    const spy = vi.mocked(console.error);
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(JSON.stringify(entry.context)).not.toContain("secret123");
  });

  it("includes context in log entry", () => {
    logger.info("workspace created", { workspaceId: "ws_123" });
    const entry = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(entry.context?.workspaceId).toBe("ws_123");
  });
});
