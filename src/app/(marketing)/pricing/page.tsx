import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PricingToggle } from "@/components/features/marketing/pricing-toggle";

export const metadata: Metadata = {
  title: "Pricing — InsightHub",
  description:
    "InsightHub is free to start. Upgrade to Pro for $19/month (₹1,499 in India) for unlimited documents, GPT-4o, Claude Sonnet, and team workspaces.",
  openGraph: {
    title: "Pricing — InsightHub",
    description: "Free tier forever. Pro at $19/month or ₹1,499/month for India.",
    type: "website",
  },
};

export default function PricingPage() {
  return (
    <div className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
            Simple, honest pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--color-text-muted)]">
            Start free. No credit card required. Upgrade when your research grows. Regional pricing
            for India — billed in INR via Razorpay.
          </p>
        </div>

        <PricingToggle />

        {/* Enterprise note */}
        <div className="mt-16 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6 text-center">
          <h3 className="font-semibold text-[var(--color-text-primary)]">
            Need a custom plan for your organisation?
          </h3>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            SSO, audit logs, data residency, and volume discounts available.{" "}
            <Link
              href="mailto:hello@insighthub.ai"
              className="font-medium text-brand-500 hover:underline underline-offset-2"
            >
              Contact us →
            </Link>
          </p>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-brand-500 px-8 py-12 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-white">Ready to build your knowledge base?</h2>
          <p className="mt-2 text-brand-100">Start free in under 60 seconds.</p>
          <Link
            href="/auth/signin"
            className={buttonVariants({ variant: "secondary", size: "lg" }) + " mt-6"}
          >
            Create free account
          </Link>
        </div>
      </div>
    </div>
  );
}
