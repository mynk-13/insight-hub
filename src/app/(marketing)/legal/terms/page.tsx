import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — InsightHub",
  description: "Terms and conditions for using the InsightHub platform.",
};

const LAST_UPDATED = "25 April 2026";

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Last updated: {LAST_UPDATED}</p>

        <div className="prose-sm mt-10 space-y-8 text-[var(--color-text-muted)] leading-relaxed">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              1. Acceptance
            </h2>
            <p>
              By creating an account or using the InsightHub platform (&quot;Service&quot;), you
              agree to these Terms of Service (&quot;Terms&quot;). If you do not agree, do not use
              the Service. These Terms apply to all users including free and paid subscribers.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              2. Eligibility
            </h2>
            <p>
              You must be at least 18 years old to use InsightHub. By using the Service, you
              represent that you meet this requirement and have the authority to enter into this
              agreement.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              3. Your account
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials.
              You agree to notify us immediately of any unauthorised access. You are responsible for
              all activity that occurs under your account.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              4. Acceptable use
            </h2>
            <p className="mb-3">You agree not to use InsightHub to:</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>Upload content that infringes third-party intellectual property rights.</li>
              <li>Upload malware, viruses, or any content designed to disrupt systems.</li>
              <li>Scrape or harvest data from other users&apos; workspaces.</li>
              <li>
                Attempt to bypass authentication, rate limiting, or tenant isolation controls.
              </li>
              <li>
                Use the AI outputs to generate disinformation, spam, or content that violates
                applicable law.
              </li>
              <li>Resell or sublicense access to the Service without our written consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              5. Your content
            </h2>
            <p>
              You retain all intellectual property rights in the documents and data you upload
              (&quot;Your Content&quot;). By uploading content, you grant InsightHub a limited,
              non-exclusive, worldwide licence to process, index, and generate embeddings from Your
              Content solely to provide the Service to you. We do not use Your Content to train AI
              models.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              6. AI outputs
            </h2>
            <p>
              InsightHub uses third-party large language models (OpenAI, Anthropic) to generate
              answers. AI-generated responses may contain errors. You are responsible for verifying
              any information before acting on it. InsightHub is not liable for decisions made based
              on AI outputs.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              7. Subscriptions and billing
            </h2>
            <p>
              Free tier access is provided with no payment obligation. Pro subscriptions are billed
              monthly in advance. You may cancel at any time; access continues until the end of the
              current billing period. Refunds are not provided for partial months unless required by
              applicable consumer protection law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              8. Service availability
            </h2>
            <p>
              We aim for high availability but do not guarantee uninterrupted service. We may
              temporarily suspend access for maintenance, security incidents, or to comply with
              legal requirements. We are not liable for losses caused by unavailability.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              9. Limitation of liability
            </h2>
            <p>
              To the fullest extent permitted by law, InsightHub&apos;s total liability to you for
              any claim arising out of or related to the Service shall not exceed the total fees you
              paid in the 12 months preceding the claim, or USD 100 if you are on the free tier.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              10. Termination
            </h2>
            <p>
              We may suspend or terminate your account for material breach of these Terms, including
              but not limited to acceptable use violations. You may delete your account at any time
              from your workspace settings. Upon termination, your data will be soft-deleted and
              permanently purged after 30 days per our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              11. Changes to these Terms
            </h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated by
              email or an in-app notice at least 14 days before taking effect. Continued use after
              the effective date constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              12. Governing law
            </h2>
            <p>
              These Terms are governed by the laws of India. Any dispute shall be subject to the
              exclusive jurisdiction of courts in Bengaluru, Karnataka.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
              13. Contact
            </h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a
                href="mailto:legal@insighthub.ai"
                className="font-medium text-brand-500 hover:underline underline-offset-2"
              >
                legal@insighthub.ai
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
