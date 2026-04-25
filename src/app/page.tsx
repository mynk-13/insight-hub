import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { MarketingHeader } from "@/components/features/marketing/marketing-header";
import { MarketingFooter } from "@/components/features/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "InsightHub — AI-Powered Research Intelligence",
  description:
    "Ingest PDFs, docs, and URLs into a queryable knowledge base. Get streaming answers with inline citations, powered by GPT-4o and Claude.",
  openGraph: {
    title: "InsightHub — AI-Powered Research Intelligence",
    description:
      "Ingest PDFs, docs, and URLs into a queryable knowledge base. Get streaming answers with inline citations.",
    type: "website",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "InsightHub",
  },
  twitter: {
    card: "summary_large_image",
    title: "InsightHub — AI-Powered Research Intelligence",
    description:
      "Ingest PDFs, docs, and URLs into a queryable knowledge base. Streaming RAG answers with inline citations.",
  },
};

const FEATURES = [
  {
    icon: "📄",
    title: "Multi-format Ingestion",
    description:
      "Upload PDFs, Word docs, markdown files, or paste any URL. OCR handles scanned documents automatically.",
  },
  {
    icon: "💬",
    title: "Streaming RAG Chat",
    description:
      "Ask questions and get answers streamed in real time, grounded in your documents with numbered inline citations.",
  },
  {
    icon: "🔗",
    title: "Inline Citations",
    description:
      "Every claim links back to the exact source passage. Click a citation to jump to the original context.",
  },
  {
    icon: "🔍",
    title: "Semantic Search",
    description:
      "Cmd-K search powered by hybrid dense + BM25 retrieval. Find any fact across your entire knowledge base in under 800 ms.",
  },
  {
    icon: "📁",
    title: "Collections & Tags",
    description:
      "Organise sources into collections, tag them, and pin up to 5 to your sidebar. Scope chat to a specific collection.",
  },
  {
    icon: "👥",
    title: "Team Workspaces",
    description:
      "Invite collaborators with Owner / Admin / Editor / Viewer roles. Annotate, comment, and @-mention teammates.",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "InsightHub cut my literature review time in half. I upload 30 papers and ask questions instead of reading every abstract.",
    name: "Arjun Mehta",
    role: "Postdoc Researcher, IISc Bangalore",
  },
  {
    quote:
      "For competitive intelligence, the citation trail is everything. InsightHub gives us the answer and shows exactly where it came from.",
    name: "Priya Sharma",
    role: "Strategy Consultant, Bengaluru",
  },
  {
    quote:
      "I shared a product spec and three competitor reports. Within minutes I had a positioning doc with cited sources. Wild.",
    name: "Divya Nair",
    role: "Product Marketing Manager",
  },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "InsightHub",
  applicationCategory: "BusinessApplication",
  description:
    "AI-powered research intelligence platform. Ingest PDFs, docs, and URLs into a queryable, cited knowledge base.",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "19",
      priceCurrency: "USD",
      billingIncrement: "month",
    },
  ],
  operatingSystem: "Web",
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-[var(--color-surface)] px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-medium text-brand-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500"></span>
              </span>
              RAG-powered · GPT-4o &amp; Claude · Zero hallucinations
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-5xl lg:text-6xl">
              Research smarter.
              <br />
              <span className="text-brand-500">Query faster.</span>
              <br />
              Cite confidently.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-text-muted)] leading-relaxed">
              InsightHub turns your PDFs, documents, and URLs into a queryable knowledge base. Ask
              questions and get streaming answers with every claim traced back to the exact source
              passage.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/signin" className={buttonVariants({ size: "lg" }) + " px-8"}>
                Start for free — no card needed
              </Link>
              <Link
                href="/pricing"
                className={buttonVariants({ variant: "outline", size: "lg" }) + " px-8"}
              >
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-xs text-[var(--color-text-muted)]">
              Free tier: 1 workspace · 10 documents · 50 queries / month
            </p>
          </div>

          {/* Hero illustration */}
          <div className="mx-auto mt-16 max-w-4xl overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400"></span>
              <span className="h-3 w-3 rounded-full bg-yellow-400"></span>
              <span className="h-3 w-3 rounded-full bg-green-400"></span>
              <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                InsightHub — research-workspace
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[var(--color-border)] text-sm">
              <div className="col-span-1 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Sources
                </p>
                {[
                  "Q4 Strategy Report.pdf",
                  "Competitor Analysis.docx",
                  "Market Research.pdf",
                  "Exec Summary.pdf",
                ].map((f) => (
                  <div
                    key={f}
                    className="mb-2 flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--color-surface-muted)]"
                  >
                    <span className="text-brand-500">📄</span>
                    <span className="truncate text-xs text-[var(--color-text-muted)]">{f}</span>
                  </div>
                ))}
              </div>
              <div className="col-span-2 p-4">
                <div className="mb-4 space-y-3">
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-xs">
                      U
                    </span>
                    <div className="rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                      What are the key growth opportunities for Q1 2025?
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs text-white">
                      AI
                    </span>
                    <div className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
                      Based on your documents, three growth opportunities stand out:{" "}
                      <span className="inline-flex items-center rounded bg-brand-50 px-1 text-brand-700 font-medium">
                        [1]
                      </span>{" "}
                      expansion into Tier-2 cities driven by rising smartphone penetration,{" "}
                      <span className="inline-flex items-center rounded bg-brand-50 px-1 text-brand-700 font-medium">
                        [2]
                      </span>{" "}
                      B2B SaaS bundling noted in the competitor analysis, and{" "}
                      <span className="inline-flex items-center rounded bg-brand-50 px-1 text-brand-700 font-medium">
                        [3]
                      </span>{" "}
                      a 34 % untapped SME segment from the market research.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                Everything you need to go from documents to decisions
              </h2>
              <p className="mt-4 text-lg text-[var(--color-text-muted)]">
                A full research stack, not a chatbot. Every answer is grounded, every claim is
                traceable.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 text-3xl">{f.icon}</div>
                  <h3 className="mb-2 font-semibold text-[var(--color-text-primary)]">{f.title}</h3>
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-[var(--color-surface-muted)] px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                From upload to insight in three steps
              </h2>
            </div>
            <ol className="mt-16 grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Ingest your sources",
                  body: "Drag-drop PDFs, paste URLs, or upload Word docs. We extract text, run OCR on scanned pages, and index everything.",
                },
                {
                  step: "02",
                  title: "Ask in plain English",
                  body: "Type any question. Our hybrid retriever pulls the most relevant passages from every source, even across hundreds of documents.",
                },
                {
                  step: "03",
                  title: "Read with confidence",
                  body: "Every sentence in the answer links back to its source passage. Low-confidence answers are flagged — we never hallucinate.",
                },
              ].map((item) => (
                <li
                  key={item.step}
                  className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
                >
                  <span className="mb-4 block text-4xl font-bold text-brand-100">{item.step}</span>
                  <h3 className="mb-2 font-semibold text-[var(--color-text-primary)]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Social proof */}
        <section id="social-proof" className="px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                Trusted by researchers, consultants, and product teams
              </h2>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure
                  key={t.name}
                  className="flex flex-col justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
                >
                  <blockquote>
                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed italic">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {t.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="bg-[var(--color-surface-muted)] px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-[var(--color-text-muted)]">
              Start free. Upgrade when you need more.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {/* Free card */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-left shadow-sm">
                <h3 className="font-semibold text-[var(--color-text-primary)]">Free</h3>
                <p className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">$0</p>
                <p className="text-sm text-[var(--color-text-muted)]">forever</p>
                <ul className="mt-6 space-y-2 text-sm text-[var(--color-text-muted)]">
                  {[
                    "1 workspace",
                    "10 documents",
                    "50 queries / month",
                    "GPT-4o-mini · Claude Haiku",
                    "Community support",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 shrink-0 text-brand-500"
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
                <Link
                  href="/auth/signin"
                  className={buttonVariants({ variant: "outline", size: "sm" }) + " mt-8 w-full"}
                >
                  Get started free
                </Link>
              </div>
              {/* Pro card */}
              <div className="relative rounded-xl border-2 border-brand-500 bg-[var(--color-surface)] p-8 text-left shadow-md">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
                <h3 className="font-semibold text-[var(--color-text-primary)]">Pro</h3>
                <p className="mt-2 text-3xl font-bold text-[var(--color-text-primary)]">$19</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  per month · ₹1,499 for India
                </p>
                <ul className="mt-6 space-y-2 text-sm text-[var(--color-text-muted)]">
                  {[
                    "Unlimited workspaces",
                    "Unlimited documents",
                    "2,000 queries / day",
                    "GPT-4o · Claude Sonnet",
                    "Priority support",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <svg
                        className="h-4 w-4 shrink-0 text-brand-500"
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
                <Link
                  href="/auth/signin"
                  className={buttonVariants({ size: "sm" }) + " mt-8 w-full"}
                >
                  Start Pro free trial
                </Link>
              </div>
            </div>
            <p className="mt-6 text-sm text-[var(--color-text-muted)]">
              Need the full comparison?{" "}
              <Link
                href="/pricing"
                className="font-medium text-brand-500 hover:text-brand-600 underline-offset-2 hover:underline"
              >
                See all plan details →
              </Link>
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl bg-brand-500 px-8 py-16 text-center shadow-xl">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Start building your knowledge base today
            </h2>
            <p className="mt-4 text-lg text-brand-100">
              Free forever. No credit card. 10 documents and 50 queries every month — on us.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/signin"
                className={buttonVariants({ variant: "secondary", size: "lg" }) + " px-8"}
              >
                Create free account
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
