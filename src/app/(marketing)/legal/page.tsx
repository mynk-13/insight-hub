import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal — InsightHub",
  description: "Privacy Policy, Terms of Service, and Cookie Policy for InsightHub.",
};

export default function LegalIndexPage() {
  return (
    <div className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Legal
        </h1>
        <p className="mt-3 text-[var(--color-text-muted)]">
          The policies and agreements that govern your use of InsightHub.
        </p>
        <ul className="mt-8 divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          {[
            {
              href: "/legal/privacy",
              label: "Privacy Policy",
              desc: "How we collect, use, and protect your data.",
            },
            {
              href: "/legal/terms",
              label: "Terms of Service",
              desc: "The rules for using InsightHub.",
            },
            {
              href: "/legal/cookies",
              label: "Cookie Policy",
              desc: "Cookies and similar tracking technologies.",
            },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center justify-between px-6 py-5 hover:bg-[var(--color-surface-muted)] transition-colors"
              >
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">{item.label}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{item.desc}</p>
                </div>
                <svg
                  className="h-5 w-5 text-[var(--color-text-muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
