import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Routes that don't require authentication
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

  const response = NextResponse.next();

  // Inject user ID into request headers for server components and API routes
  if (session?.user?.id) {
    response.headers.set("x-user-id", session.user.id);
  }

  // Extract workspace slug from /ws/[slug] routes and inject for downstream use
  const wsMatch = pathname.match(/^\/ws\/([^/]+)/);
  if (wsMatch?.[1]) {
    response.headers.set("x-workspace-slug", wsMatch[1]);
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
