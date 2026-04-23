import "server-only";
import type { RankedChunk } from "./types";

const NO_RESULTS_RESPONSE =
  "I couldn't find relevant information in your knowledge base to answer that question. " +
  "Please try rephrasing your query or upload sources that cover this topic.";

export function hasUsableChunks(chunks: RankedChunk[]): boolean {
  return chunks.some((c) => c.topScore > 0.7 || c.rrfScore >= 0.015);
}

export function buildSystemPrompt(chunks: RankedChunk[]): string {
  const passages = chunks
    .map(
      (c, i) =>
        `[${i + 1}] Source: "${c.sourceName}"${c.pageNumber ? ` (page ${c.pageNumber})` : ""}\n${c.content}`,
    )
    .join("\n\n---\n\n");

  return `You are an AI research assistant with access to the user's knowledge base. \
Answer questions based ONLY on the provided passages. \
When you use information from a passage, cite it inline using the format [n] where n is the passage number. \
Cite every factual claim. If passages conflict, note the discrepancy. \
Do NOT use prior knowledge outside these passages.

PASSAGES:
${passages}

IMPORTANT: If the passages do not contain enough information to answer the question, \
say so clearly instead of speculating.`;
}

export { NO_RESULTS_RESPONSE };
