"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface SignInFormProps {
  callbackUrl?: string;
}

export function SignInForm({ callbackUrl = "/dashboard" }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOAuth(provider: "google" | "github") {
    setLoading(provider);
    setError(null);
    await signIn(provider, { callbackUrl });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading("email");
    setError(null);
    try {
      const res = await signIn("resend", {
        email,
        callbackUrl,
        redirect: false,
      });
      setLoading(null);
      // Auth.js v5: ok=false or error set means failure
      if (res && (!res.ok || res.error)) {
        setError("Could not send magic link — try Google or GitHub sign-in above.");
      } else {
        setEmailSent(true);
      }
    } catch {
      setLoading(null);
      setError("Could not send magic link — try Google or GitHub sign-in above.");
    }
  }

  if (emailSent) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to <strong>{email}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("google")}
          disabled={!!loading}
        >
          {loading === "google" ? "Connecting…" : "Continue with Google"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth("github")}
          disabled={!!loading}
        >
          {loading === "github" ? "Connecting…" : "Continue with GitHub"}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleMagicLink} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!!loading}
          />
          <p className="text-xs text-muted-foreground">
            Magic link is in limited beta. <strong>Google or GitHub sign-in is recommended.</strong>
          </p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={!!loading}>
          {loading === "email" ? "Sending…" : "Continue with Email"}
        </Button>
      </form>
    </div>
  );
}
