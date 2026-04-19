import NextAuth from "next-auth";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Inline Redis client — edge-compatible HTTP client, no TCP connection.
// Kept separate from src/lib/shared/cache to avoid bundling server-only modules.
const kickRedis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "http://localhost",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

const PUBLIC_PATHS = new Set([
  "/",
  "/pricing",
  "/privacy",
  "/terms",
  "/cookies",
  "/auth/signin",
  "/auth/verify",
  "/auth/error",
]);

const PUBLIC_PREFIXES = ["/api/auth", "/_next", "/favicon"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export default auth(async function middleware(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl;
  const session = (req as { auth?: { user?: { id?: string } } }).auth;

  if (!isPublic(pathname) && !session?.user) {
    const signIn = new URL("/auth/signin", req.url);
    signIn.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signIn);
  }

  // Session kick: force sign-out when a member's role is changed or they're removed.
  // The WorkspaceService sets session:kick:{userId} in Redis; we consume it here once.
  if (session?.user?.id) {
    const kickKey = `session:kick:${session.user.id}`;
    const kicked = await kickRedis.get(kickKey);
    if (kicked) {
      await kickRedis.del(kickKey);
      const signIn = new URL("/auth/signin", req.url);
      const response = NextResponse.redirect(signIn);
      // Clear the Auth.js session cookie so the user is fully signed out
      response.cookies.delete("authjs.session-token");
      response.cookies.delete("__Secure-authjs.session-token");
      return response;
    }
  }

  const response = NextResponse.next();

  if (session?.user?.id) {
    response.headers.set("x-user-id", session.user.id);
  }

  const wsMatch = pathname.match(/^\/ws\/([^/]+)/);
  if (wsMatch?.[1]) {
    response.headers.set("x-workspace-slug", wsMatch[1]);
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
