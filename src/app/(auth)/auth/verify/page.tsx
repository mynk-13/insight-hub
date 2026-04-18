import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Check your email — InsightHub",
};

export default function VerifyPage() {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          A sign-in link has been sent to your email address. The link expires in 24 hours.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Didn&apos;t receive it? Check your spam folder or{" "}
        <Link href="/auth/signin" className="underline underline-offset-2 hover:text-foreground">
          try again
        </Link>
        .
      </p>

      <Link
        href="/auth/signin"
        className={buttonVariants({ variant: "outline", className: "w-full" })}
      >
        Back to sign in
      </Link>
    </div>
  );
}
