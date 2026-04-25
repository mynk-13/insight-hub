"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-[var(--color-text-primary)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white text-sm font-bold">
            IH
          </span>
          InsightHub
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/#features"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/legal/privacy"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Legal
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/auth/signin" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Sign in
          </Link>
          <Link href="/auth/signin" className={buttonVariants({ size: "sm" })}>
            Get started free
          </Link>
        </div>

        <button
          className="flex items-center justify-center rounded-md p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/#features"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
            >
              Pricing
            </Link>
            <Link
              href="/legal/privacy"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
            >
              Legal
            </Link>
            <div className="mt-2 flex flex-col gap-2 border-t border-[var(--color-border)] pt-2">
              <Link
                href="/auth/signin"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Sign in
              </Link>
              <Link href="/auth/signin" className={buttonVariants({ size: "sm" })}>
                Get started free
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
