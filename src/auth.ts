import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/shared/db";
import { authConfig } from "./auth.config";
import { sessionJwt } from "@/lib/modules/auth/session";
import { writeAuditLog } from "@/lib/modules/auth/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers,
    Resend({
      apiKey: process.env.RESEND_API_KEY!,
      // Use Resend's shared domain for dev; replace with verified domain at launch
      from: "InsightHub <onboarding@resend.dev>",
    }),
  ],
  jwt: {
    encode: sessionJwt.encode,
    decode: sessionJwt.decode,
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      await writeAuditLog({
        action: isNewUser ? "SIGN_IN" : "SIGN_IN",
        userId: user.id,
        metadata: { provider: "oauth", isNewUser },
      });
    },
    async signOut(message) {
      const userId = "token" in message ? (message.token?.id as string | undefined) : undefined;
      await writeAuditLog({
        action: "SIGN_OUT",
        userId,
      });
    },
  },
});
