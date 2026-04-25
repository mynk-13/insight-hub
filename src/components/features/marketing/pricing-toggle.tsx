"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const FEATURES_COMPARE = [
  { label: "Workspaces", free: "1", pro: "Unlimited" },
  { label: "Documents per workspace", free: "10", pro: "Unlimited" },
  { label: "Queries per month", free: "50", pro: "2,000 / day" },
  { label: "LLM models", free: "GPT-4o-mini · Haiku", pro: "GPT-4o · Sonnet" },
  { label: "File formats", free: "PDF, DOCX, URL, MD", pro: "PDF, DOCX, URL, MD" },
  { label: "OCR for scanned PDFs", free: "✓", pro: "✓" },
  { label: "Hybrid semantic search", free: "✓", pro: "✓" },
  { label: "Inline citations", free: "✓", pro: "✓" },
  { label: "Collections", free: "3 max", pro: "Unlimited" },
  { label: "Team members", free: "Solo only", pro: "Unlimited" },
  { label: "Annotations & comments", free: "—", pro: "✓" },
  { label: "Analytics dashboard", free: "—", pro: "✓" },
  { label: "Workspace export (ZIP/MD)", free: "—", pro: "✓" },
  { label: "Priority support", free: "—", pro: "✓" },
] as const;

const FAQS = [
  {
    q: "Is the free tier really free forever?",
    a: "Yes. No credit card required. The free tier is not a trial — you get 1 workspace, 10 documents, and 50 queries every calendar month for as long as you like.",
  },
  {
    q: "Which payment methods are accepted?",
    a: "For India: UPI, Net Banking, and cards via Razorpay. Internationally: Visa, Mastercard, American Express via Stripe, and PayPal. BillDesk is available as an additional India fallback.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your workspace billing settings and your subscription stays active through the end of the current billing period. No cancellation fees.",
  },
  {
    q: "What happens when I hit my query limit?",
    a: "Free tier queries reset on the 1st of each month. On Pro, the 2,000-query daily limit also resets daily. You'll see a usage gauge in your workspace before you hit the cap.",
  },
  {
    q: "Is my data private?",
    a: "Your documents are stored in Vercel Blob, encrypted at rest. Vector embeddings are workspace-scoped in Pinecone — no cross-tenant access is possible. Full details in our Privacy Policy.",
  },
  {
    q: "Which LLMs does InsightHub use?",
    a: "Free: GPT-4o-mini and Claude Haiku. Pro: GPT-4o and Claude Sonnet. You can switch models per chat session from the model selector in the chat interface.",
  },
] as const;

export function PricingToggle() {
  const [currency, setCurrency] = useState<"usd" | "inr">("usd");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      {/* Currency toggle */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1">
          <button
            onClick={() => setCurrency("usd")}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
              currency === "usd"
                ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text-primary)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            USD ($)
          </button>
          <button
            onClick={() => setCurrency("inr")}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
              currency === "inr"
                ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text-primary)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            INR (₹)
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:gap-12">
        {/* Free */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Free</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Everything you need to get started.
          </p>
          <div className="mt-6">
            <span className="text-5xl font-bold text-[var(--color-text-primary)]">
              {currency === "usd" ? "$0" : "₹0"}
            </span>
            <span className="ml-2 text-sm text-[var(--color-text-muted)]">/ month</span>
          </div>
          <Link
            href="/auth/signin"
            className={buttonVariants({ variant: "outline", size: "lg" }) + " mt-8 w-full"}
          >
            Start for free
          </Link>
          <ul className="mt-8 space-y-3">
            {[
              "1 workspace",
              "10 documents",
              "50 queries / month",
              "GPT-4o-mini & Claude Haiku",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-[var(--color-text-muted)]"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="relative rounded-2xl border-2 border-brand-500 bg-[var(--color-surface)] p-8 shadow-lg">
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-4 py-1 text-sm font-semibold text-white shadow">
            Most popular
          </span>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Pro</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {currency === "usd"
              ? "For power users and teams."
              : "For power users and teams. India pricing."}
          </p>
          <div className="mt-6">
            <span className="text-5xl font-bold text-[var(--color-text-primary)]">
              {currency === "usd" ? "$19" : "₹1,499"}
            </span>
            <span className="ml-2 text-sm text-[var(--color-text-muted)]">/ month</span>
          </div>
          {currency === "inr" && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Billed in INR via Razorpay — no forex charges.
            </p>
          )}
          <Link href="/auth/signin" className={buttonVariants({ size: "lg" }) + " mt-8 w-full"}>
            Get Pro
          </Link>
          <ul className="mt-8 space-y-3">
            {[
              "Unlimited workspaces",
              "Unlimited documents",
              "2,000 queries / day",
              "GPT-4o & Claude Sonnet",
              "Annotations, analytics & export",
              "Unlimited team members",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-[var(--color-text-muted)]"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="mt-20">
        <h2 className="text-center text-2xl font-bold text-[var(--color-text-primary)]">
          Full feature comparison
        </h2>
        <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--color-border)] shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                <th className="px-6 py-4 text-left font-semibold text-[var(--color-text-primary)]">
                  Feature
                </th>
                <th className="px-6 py-4 text-center font-semibold text-[var(--color-text-primary)]">
                  Free
                </th>
                <th className="px-6 py-4 text-center font-semibold text-brand-600">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
              {FEATURES_COMPARE.map((row) => (
                <tr key={row.label} className="hover:bg-[var(--color-surface-muted)]">
                  <td className="px-6 py-3 text-[var(--color-text-muted)]">{row.label}</td>
                  <td className="px-6 py-3 text-center text-[var(--color-text-muted)]">
                    {row.free}
                  </td>
                  <td className="px-6 py-3 text-center font-medium text-[var(--color-text-primary)]">
                    {row.pro}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-20">
        <h2 className="text-center text-2xl font-bold text-[var(--color-text-primary)]">
          Frequently asked questions
        </h2>
        <dl className="mt-8 space-y-4">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                aria-expanded={openFaq === i}
              >
                <span>{faq.q}</span>
                <svg
                  className={`ml-4 h-5 w-5 shrink-0 text-[var(--color-text-muted)] transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openFaq === i && (
                <dd className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-6 py-4 text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {faq.a}
                </dd>
              )}
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
