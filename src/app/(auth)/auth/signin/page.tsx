import { Suspense } from "react";
import type { Metadata } from "next";
import { SignInForm } from "@/components/features/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in — InsightHub",
  description: "Sign in to your InsightHub account",
};

interface SignInPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

const errorMessages: Record<string, string> = {
  OAuthSignin: "Error starting OAuth flow. Please try again.",
  OAuthCallback: "Error during OAuth callback. Please try again.",
  OAuthCreateAccount: "Could not create account. Please try again.",
  EmailSignin: "Error sending magic link. Please try again.",
  CredentialsSignin: "Invalid credentials.",
  default: "An error occurred. Please try again.",
};

async function SignInContent({ searchParams }: SignInPageProps) {
  const { callbackUrl, error } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to InsightHub</h1>
        <p className="text-sm text-muted-foreground">Sign in to your research workspace</p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {errorMessages[error] ?? errorMessages.default}
        </p>
      )}

      <SignInForm callbackUrl={callbackUrl ?? "/dashboard"} />

      <p className="text-center text-xs text-muted-foreground">
        By signing in you agree to our{" "}
        <a href="/terms" className="underline underline-offset-2">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to InsightHub</h1>
          </div>
        </div>
      }
    >
      <SignInContent searchParams={searchParams} />
    </Suspense>
  );
}
