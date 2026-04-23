// Matches [1], [2], ..., [9] citation markers produced by the LLM
const CITATION_REGEX = /\[([1-9])\]/g;

export type ParsedSegment = { type: "text"; content: string } | { type: "citation"; index: number };

export function parseCitationSegments(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CITATION_REGEX)) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "citation", index: parseInt(match[1], 10) });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

export function extractCitationIndices(text: string): number[] {
  const indices = new Set<number>();
  for (const match of text.matchAll(CITATION_REGEX)) {
    indices.add(parseInt(match[1], 10));
  }
  return Array.from(indices).sort((a, b) => a - b);
}
