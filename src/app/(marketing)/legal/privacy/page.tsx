import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — InsightHub",
  description: "How InsightHub collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "25 April 2026";

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Last updated: {LAST_UPDATED}</p>

        <div className="prose-sm mt-10 space-y-8 text-[var(--color-text-muted)] leading-relaxed">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              1. Who we are
            </h2>
            <p>
              InsightHub (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the InsightHub
              platform, an AI-powered research intelligence service. This Privacy Policy explains
              how we handle personal data when you use our website and services.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              2. Data we collect
            </h2>
            <p className="mb-3">We collect the following categories of data:</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-[var(--color-text-primary)]">Account data</strong> — Name,
                email address, and profile picture provided at sign-up via Google, GitHub, or
                magic-link authentication.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Content data</strong> —
                Documents, URLs, and other files you upload to your workspaces. These are stored
                encrypted at rest in Vercel Blob storage.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Usage data</strong> — Query
                history, annotation data, and workspace activity logs. Used to power analytics and
                improve the service.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Billing data</strong> —
                Subscription status and payment reference IDs. We do not store raw card numbers;
                payment processing is handled by Stripe, Razorpay, PayPal, or BillDesk.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Technical data</strong> — IP
                address, browser type, and request logs retained for up to 30 days for security and
                abuse prevention.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              3. How we use your data
            </h2>
            <ul className="ml-5 list-disc space-y-2">
              <li>To provide, operate, and improve the InsightHub service.</li>
              <li>
                To generate vector embeddings from your documents for semantic search and RAG
                retrieval. Embeddings are workspace-scoped and are never shared across tenants.
              </li>
              <li>
                To send transactional emails (magic-links, invitation emails, billing notifications)
                via Resend.
              </li>
              <li>To detect and prevent fraud, abuse, and security incidents.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal data or your document content to any third party. We do
              not use your documents to train AI models.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              4. Data sharing
            </h2>
            <p className="mb-3">
              We share data with the following sub-processors solely as necessary to deliver the
              service:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-[var(--color-text-primary)]">Neon</strong> — Postgres
                database hosting (Mumbai region).
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Pinecone</strong> — Vector
                database for semantic embeddings.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Vercel</strong> — Application
                hosting and Blob file storage.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">OpenAI / Anthropic</strong> —
                LLM inference for chat completions and embeddings.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Upstash</strong> — Redis
                caching and rate limiting.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Resend</strong> — Transactional
                email delivery.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">
                  Stripe / Razorpay / PayPal / BillDesk
                </strong>{" "}
                — Payment processing.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              5. Data retention
            </h2>
            <p>
              We retain your account data for as long as your account is active. If you delete your
              workspace, documents are soft-deleted and permanently purged after 30 days from
              Postgres, Pinecone, and Blob storage. You may request immediate hard deletion from
              your workspace settings.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              6. Your rights
            </h2>
            <p className="mb-3">
              Depending on your jurisdiction, you may have the following rights:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-[var(--color-text-primary)]">Access</strong> — Request a
                copy of the personal data we hold about you.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Deletion</strong> — Request
                deletion of your account and all associated data. Use the &quot;Right to
                Delete&quot; option in workspace settings, or email us.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Portability</strong> — Export
                your workspace content as a ZIP archive from workspace settings.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Correction</strong> — Update
                your name and email from your account settings.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              7. Cookies
            </h2>
            <p>
              We use cookies for session authentication and preference storage. No advertising or
              cross-site tracking cookies are used. See our{" "}
              <Link
                href="/legal/cookies"
                className="font-medium text-brand-500 hover:underline underline-offset-2"
              >
                Cookie Policy
              </Link>{" "}
              for details.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              8. Security
            </h2>
            <p>
              Data is encrypted in transit (TLS 1.3) and at rest. We use Row-Level Security in
              Postgres to enforce tenant isolation at the database layer. Authentication sessions
              are signed with HMAC-SHA256. We conduct periodic security audits and maintain zero
              high/critical CVEs as a release gate.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              9. Contact
            </h2>
            <p>
              For privacy inquiries or data subject requests, contact us at{" "}
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
