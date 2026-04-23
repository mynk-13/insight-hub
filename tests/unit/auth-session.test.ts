import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth/jwt before importing the session module
vi.mock("next-auth/jwt", () => ({
  encode: vi.fn(),
  decode: vi.fn(),
}));

import { encode as mockEncode, decode as mockDecode } from "next-auth/jwt";
import { sessionJwt } from "@/lib/modules/auth/session";

const MOCK_TOKEN = { sub: "user-1", id: "user-1", iat: 1000, exp: 9999 };
const ENCODED = "mock.jwt.token";

describe("sessionJwt — dual HMAC key rotation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress env-var access — tests set env directly
    process.env.AUTH_SECRET_CURRENT = "current-secret";
    process.env.AUTH_SECRET_PREVIOUS = "previous-secret";
  });

  it("encode uses AUTH_SECRET_CURRENT", async () => {
    vi.mocked(mockEncode).mockResolvedValue(ENCODED);
    const result = await sessionJwt.encode({ token: MOCK_TOKEN, secret: "", salt: "test" });
    expect(mockEncode).toHaveBeenCalledWith(expect.objectContaining({ secret: "current-secret" }));
    expect(result).toBe(ENCODED);
  });

  it("decode succeeds with current secret", async () => {
    vi.mocked(mockDecode).mockResolvedValue(MOCK_TOKEN);
    const result = await sessionJwt.decode({ token: ENCODED, secret: "", salt: "test" });
    expect(mockDecode).toHaveBeenCalledWith(expect.objectContaining({ secret: "current-secret" }));
    expect(result).toEqual(MOCK_TOKEN);
  });

  it("decode falls back to previous secret when current fails", async () => {
    vi.mocked(mockDecode)
      .mockRejectedValueOnce(new Error("invalid signature"))
      .mockResolvedValueOnce(MOCK_TOKEN);

    const result = await sessionJwt.decode({ token: ENCODED, secret: "", salt: "test" });
    expect(mockDecode).toHaveBeenCalledTimes(2);
    expect(mockDecode).toHaveBeenLastCalledWith(
      expect.objectContaining({ secret: "previous-secret" }),
    );
    expect(result).toEqual(MOCK_TOKEN);
  });

  it("decode returns null when both secrets fail", async () => {
    vi.mocked(mockDecode).mockRejectedValue(new Error("invalid signature"));
    const result = await sessionJwt.decode({ token: ENCODED, secret: "", salt: "test" });
    expect(result).toBeNull();
  });

  it("decode returns null when previous secret is unset and current fails", async () => {
    delete process.env.AUTH_SECRET_PREVIOUS;
    vi.mocked(mockDecode).mockRejectedValue(new Error("invalid signature"));
    const result = await sessionJwt.decode({ token: ENCODED, secret: "", salt: "test" });
    expect(result).toBeNull();
  });

  it("encode falls back to AUTH_SECRET when AUTH_SECRET_CURRENT is unset", async () => {
    delete process.env.AUTH_SECRET_CURRENT;
    process.env.AUTH_SECRET = "fallback-secret";
    vi.mocked(mockEncode).mockResolvedValue(ENCODED);
    await sessionJwt.encode({ token: MOCK_TOKEN, secret: "", salt: "test" });
    expect(mockEncode).toHaveBeenCalledWith(expect.objectContaining({ secret: "fallback-secret" }));
    delete process.env.AUTH_SECRET;
  });
});
