import { describe, it, expect, beforeEach } from "vitest";
import { CircuitBreaker } from "@/lib/shared/circuit-breaker";

describe("CircuitBreaker", () => {
  let cb: CircuitBreaker<string>;

  beforeEach(() => {
    cb = new CircuitBreaker("test", {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 100,
    });
  });

  it("starts in closed state", () => {
    expect(cb.getStats().state).toBe("closed");
  });

  it("executes successfully in closed state", async () => {
    const result = await cb.execute(async () => "ok");
    expect(result).toBe("ok");
  });

  it("transitions to open after failureThreshold failures", async () => {
    const failing = async () => {
      throw new Error("fail");
    };
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failing)).rejects.toThrow("fail");
    }
    expect(cb.getStats().state).toBe("open");
  });

  it("throws immediately when open", async () => {
    const failing = async () => {
      throw new Error("fail");
    };
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failing)).rejects.toThrow("fail");
    }
    await expect(cb.execute(async () => "ok")).rejects.toThrow("Circuit breaker [test] is open");
  });

  it("transitions to half-open after timeout", async () => {
    const failing = async () => {
      throw new Error("fail");
    };
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failing)).rejects.toThrow("fail");
    }
    await new Promise((r) => setTimeout(r, 150));
    const result = await cb.execute(async () => "ok");
    expect(result).toBe("ok");
    expect(cb.getStats().state).toBe("half-open");
  });

  it("transitions back to closed after successThreshold successes in half-open", async () => {
    const failing = async () => {
      throw new Error("fail");
    };
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failing)).rejects.toThrow("fail");
    }
    await new Promise((r) => setTimeout(r, 150));
    await cb.execute(async () => "ok");
    await cb.execute(async () => "ok");
    expect(cb.getStats().state).toBe("closed");
  });

  it("resets to closed state", async () => {
    const failing = async () => {
      throw new Error("fail");
    };
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failing)).rejects.toThrow("fail");
    }
    cb.reset();
    expect(cb.getStats().state).toBe("closed");
    const result = await cb.execute(async () => "ok");
    expect(result).toBe("ok");
  });
});
