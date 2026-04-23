import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    setupFiles: ["./tests/unit/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
      include: ["src/lib/modules/**/*.ts", "src/lib/shared/**/*.ts", "src/hooks/**/*.ts"],
      exclude: [
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/index.ts",
        // Infrastructure modules that require real DB/email/Redis/external APIs — covered by E2E, not unit tests
        "src/lib/modules/workspace/service.ts",
        "src/lib/modules/workspace/invitation.ts",
        "src/lib/modules/auth/audit.ts",
        "src/lib/shared/db/**",
        // Ingestion modules that require real OpenAI/Pinecone/Tesseract/HTTP — covered by E2E
        "src/lib/modules/ingestion/embedder.ts",
        "src/lib/modules/ingestion/indexer.ts",
        "src/lib/modules/ingestion/pipeline.ts",
        "src/lib/modules/ingestion/quota.ts",
        "src/lib/modules/ingestion/types.ts",
        "src/lib/modules/ingestion/extractors/docx.ts",
        "src/lib/modules/ingestion/extractors/pdf.ts",
        "src/lib/modules/ingestion/extractors/url.ts",
        // RAG modules requiring real Pinecone/OpenAI/Upstash/AI-SDK — covered by E2E
        "src/lib/modules/rag/retriever.ts",
        "src/lib/modules/rag/rate-limiter.ts",
        "src/lib/modules/rag/models.ts",
        "src/lib/modules/rag/types.ts",
        "src/lib/shared/embeddings/index.ts",
        // Client hook — not unit-testable in jsdom without full browser streaming API
        "src/hooks/**",
        // Search modules requiring real Pinecone/OpenAI/Upstash — covered by E2E
        "src/lib/modules/search/searcher.ts",
        "src/lib/modules/search/history.ts",
        // Collection service requiring real DB — covered by E2E
        "src/lib/modules/workspace/collection.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
