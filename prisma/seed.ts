import type { SourceType } from "@prisma/client";
import { PrismaClient, SourceStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database…");

  // Seed user
  const user = await prisma.user.upsert({
    where: { email: "seed@insighthub.dev" },
    update: {},
    create: {
      name: "Seed User",
      email: "seed@insighthub.dev",
      emailVerified: new Date(),
    },
  });

  // Seed workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "seed-workspace" },
    update: {},
    create: {
      name: "Seed Workspace",
      slug: "seed-workspace",
      ownerId: user.id,
      tier: "FREE",
    },
  });

  // Add user as OWNER
  await prisma.member.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
  });

  // Default collection
  await prisma.collection.upsert({
    where: {
      id: `seed-inbox-${workspace.id}`,
    },
    update: {},
    create: {
      id: `seed-inbox-${workspace.id}`,
      workspaceId: workspace.id,
      name: "Inbox",
      isPinned: true,
      sortOrder: 0,
      createdById: user.id,
    },
  });

  // 50 sample sources
  const sourceTypes: SourceType[] = ["PDF", "DOCX", "URL", "MARKDOWN"];
  const topics = [
    "Transformer Architecture Survey",
    "Attention Is All You Need",
    "BERT: Pre-training of Deep Bidirectional Transformers",
    "GPT-4 Technical Report",
    "LLaMA 2: Open Foundation and Fine-Tuned Chat Models",
    "Retrieval-Augmented Generation for Knowledge-Intensive NLP",
    "Dense Passage Retrieval for Open-Domain QA",
    "ColBERT: Efficient and Effective Passage Search",
    "Hybrid BM25 + Dense Retrieval Benchmarks",
    "Scaling Laws for Neural Language Models",
    "Constitutional AI: Harmlessness from AI Feedback",
    "Chain-of-Thought Prompting",
    "Self-Consistency Improves Chain of Thought",
    "Tree of Thoughts: Deliberate Problem Solving",
    "ReAct: Synergizing Reasoning and Acting",
    "Toolformer: Language Models Can Teach Themselves to Use Tools",
    "HuggingGPT: Solving AI Tasks with ChatGPT",
    "AutoGPT Architecture Analysis",
    "LangChain RAG Cookbook",
    "Pinecone Vector Search Best Practices",
    "pgvector vs Pinecone Benchmark",
    "Neon Postgres Serverless Guide",
    "Next.js 15 App Router Deep Dive",
    "Vercel Edge Runtime Capabilities",
    "Upstash Redis Rate Limiting Patterns",
    "Auth.js v5 Migration Guide",
    "Prisma ORM Performance Tips",
    "Stripe Subscription Lifecycle",
    "Razorpay UPI Integration",
    "Multi-Tenant SaaS Architecture",
    "Row Level Security in PostgreSQL",
    "OWASP Top 10 for LLM Applications",
    "Prompt Injection Attack Vectors",
    "Zero-Trust Security Model",
    "GDPR Data Processing Agreements",
    "Information Retrieval Evaluation Metrics",
    "NDCG and MRR Explained",
    "BM25 Algorithm Deep Dive",
    "Reciprocal Rank Fusion",
    "Cross-Encoder Reranking Strategies",
    "Token Budget Optimization for RAG",
    "Hallucination Detection in LLMs",
    "Confidence Calibration for Generative Models",
    "Streaming Responses with Vercel AI SDK",
    "Server-Sent Events vs WebSockets",
    "React Server Components Architecture",
    "Partial Prerendering in Next.js",
    "TanStack Query v5 Migration",
    "Zustand State Management Patterns",
    "Tailwind CSS v4 Breaking Changes",
  ];

  const sources = await Promise.all(
    topics.slice(0, 50).map((title, i) =>
      prisma.source.upsert({
        where: {
          workspaceId_contentHash: {
            workspaceId: workspace.id,
            contentHash: `seed-hash-${i}`,
          },
        },
        update: {},
        create: {
          workspaceId: workspace.id,
          title,
          type: sourceTypes[i % sourceTypes.length]!,
          contentHash: `seed-hash-${i}`,
          status: SourceStatus.INDEXED,
          pageCount: Math.floor(Math.random() * 40) + 5,
          wordCount: Math.floor(Math.random() * 8000) + 1000,
          createdById: user.id,
        },
      }),
    ),
  );

  console.log(`Seeded: 1 user, 1 workspace, ${sources.length} sources`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
