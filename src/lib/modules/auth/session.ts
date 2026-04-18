import { encode as defaultEncode, decode as defaultDecode } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

// Dual HMAC key rotation: encode with current secret, decode accepts both
// current and previous. Enables zero-downtime secret rotation.

// Secrets are read lazily so tests can set env vars before each call
function currentSecret() {
  return process.env.AUTH_SECRET_CURRENT ?? process.env.AUTH_SECRET ?? "";
}
function previousSecret() {
  return process.env.AUTH_SECRET_PREVIOUS ?? "";
}

export const sessionJwt = {
  async encode(params: Parameters<typeof defaultEncode>[0]): Promise<string> {
    return defaultEncode({ ...params, secret: currentSecret() });
  },

  async decode(params: Parameters<typeof defaultDecode>[0]): Promise<JWT | null> {
    // Try current secret first, fall back to previous on failure
    try {
      return await defaultDecode({ ...params, secret: currentSecret() });
    } catch {
      const prev = previousSecret();
      if (!prev) return null;
      try {
        return await defaultDecode({ ...params, secret: prev });
      } catch {
        return null;
      }
    }
  },
};
