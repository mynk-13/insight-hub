import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy — InsightHub",
  description: "How InsightHub uses cookies and similar tracking technologies.",
};

const LAST_UPDATED = "25 April 2026";

export default function CookiesPage() {
  return (
    <div className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href="/legal"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            ← Legal
          </Link>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Cookie Policy
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Last updated: {LAST_UPDATED}</p>

        <div className="prose-sm mt-10 space-y-8 text-[var(--color-text-muted)] leading-relaxed">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              1. What are cookies?
            </h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They are
              widely used to make websites work, improve user experience, and provide analytical
              information to site owners.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              2. Cookies we use
            </h2>
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
                    <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-primary)]">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-primary)]">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-primary)]">
                      Purpose
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-primary)]">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                  {[
                    {
                      name: "__Secure-authjs.session-token",
                      type: "Essential",
                      purpose:
                        "Maintains your authenticated session. HttpOnly, Secure, SameSite=Lax.",
                      duration: "30 days",
                    },
                    {
                      name: "__Host-authjs.csrf-token",
                      type: "Essential",
                      purpose: "CSRF protection for auth form submissions.",
                      duration: "Session",
                    },
                    {
                      name: "authjs.callback-url",
                      type: "Essential",
                      purpose: "Stores the URL to redirect to after sign-in.",
                      duration: "Session",
                    },
                    {
                      name: "insighthub-theme",
                      type: "Preference",
                      purpose: "Remembers your light/dark mode preference.",
                      duration: "1 year",
                    },
                  ].map((row) => (
                    <tr key={row.name}>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-primary)]">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-xs">{row.type}</td>
                      <td className="px-4 py-3 text-xs">{row.purpose}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              3. No advertising cookies
            </h2>
            <p>
              We do not use advertising cookies, cross-site tracking cookies, or share cookie data
              with advertising networks. We do not use Google Analytics or any third-party analytics
              platform that places cookies. Our product analytics (PostHog, used for internal usage
              metrics) operates in a cookieless mode where possible.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              4. Managing cookies
            </h2>
            <p>
              Essential cookies are required for the Service to function. You can disable them in
              your browser settings, but this will prevent you from signing in. Preference cookies
              can be deleted at any time; your preferences will reset to defaults.
            </p>
            <p className="mt-3">Browser-specific guidance for managing cookies:</p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>
                <strong className="text-[var(--color-text-primary)]">Chrome</strong>: Settings →
                Privacy and security → Cookies
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Firefox</strong>: Settings →
                Privacy &amp; Security → Cookies and Site Data
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Safari</strong>: Settings →
                Privacy → Manage Website Data
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Edge</strong>: Settings →
                Cookies and site permissions
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              5. Changes to this policy
            </h2>
            <p>
              We may update this Cookie Policy when we change our technology stack or add new
              features. We will update the &quot;Last updated&quot; date at the top of this page.
              Continued use of the Service after the update date constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              6. Contact
            </h2>
            <p>
              Questions? Email{" "}
              <a
                href="mailto:privacy@insighthub.ai"
                className="font-medium text-brand-500 hover:underline underline-offset-2"
              >
                privacy@insighthub.ai
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
