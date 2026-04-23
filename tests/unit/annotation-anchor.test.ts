import { describe, it, expect } from "vitest";

// Pure logic: anchor validation and mention parsing
// (AnnotationService is server-only with DB deps — tested via behaviour contracts here)

function validateAnchor(anchor: { text: string; start: number; end: number }): boolean {
  if (!anchor.text || anchor.text.trim().length === 0) return false;
  if (anchor.text.length > 2000) return false;
  if (anchor.start < 0) return false;
  if (anchor.end <= anchor.start) return false;
  if (anchor.end - anchor.start > 2000) return false;
  return true;
}

function parseMentions(content: string): string[] {
  const matches = content.match(/@\[([^\]]+)\]\(([^)]+)\)/g) ?? [];
  return matches
    .map((m) => {
      const idMatch = m.match(/\(([^)]+)\)/);
      return idMatch ? idMatch[1] : "";
    })
    .filter(Boolean);
}

function buildMentionText(name: string, id: string): string {
  return `@[${name}](${id})`;
}

describe("annotation anchor validation", () => {
  it("accepts a valid anchor", () => {
    expect(validateAnchor({ text: "hello world", start: 0, end: 11 })).toBe(true);
  });

  it("rejects empty text", () => {
    expect(validateAnchor({ text: "", start: 0, end: 0 })).toBe(false);
  });

  it("rejects whitespace-only text", () => {
    expect(validateAnchor({ text: "   ", start: 0, end: 3 })).toBe(false);
  });

  it("rejects negative start", () => {
    expect(validateAnchor({ text: "hello", start: -1, end: 5 })).toBe(false);
  });

  it("rejects end <= start", () => {
    expect(validateAnchor({ text: "hello", start: 5, end: 5 })).toBe(false);
  });

  it("rejects end < start", () => {
    expect(validateAnchor({ text: "hello", start: 10, end: 5 })).toBe(false);
  });

  it("rejects text longer than 2000 chars", () => {
    expect(validateAnchor({ text: "a".repeat(2001), start: 0, end: 2001 })).toBe(false);
  });

  it("accepts text at exactly 2000 chars", () => {
    expect(validateAnchor({ text: "a".repeat(2000), start: 0, end: 2000 })).toBe(true);
  });
});

describe("@-mention parsing", () => {
  it("parses a single mention", () => {
    const content = "Hello @[Alice](user_abc123) check this out";
    expect(parseMentions(content)).toEqual(["user_abc123"]);
  });

  it("parses multiple mentions", () => {
    const content = "@[Alice](uid1) and @[Bob](uid2) please review";
    expect(parseMentions(content)).toEqual(["uid1", "uid2"]);
  });

  it("returns empty array when no mentions", () => {
    expect(parseMentions("no mentions here")).toEqual([]);
  });

  it("ignores plain @ without mention format", () => {
    expect(parseMentions("contact me @alice for help")).toEqual([]);
  });

  it("handles duplicate mentions", () => {
    const content = "@[Alice](uid1) and @[Alice](uid1) again";
    expect(parseMentions(content)).toEqual(["uid1", "uid1"]);
  });

  it("extracts correct ids with cuid-style ids", () => {
    const content = "@[Bob Smith](clz1234567890abcdef) done";
    expect(parseMentions(content)).toEqual(["clz1234567890abcdef"]);
  });

  it("buildMentionText produces parseable output", () => {
    const text = buildMentionText("Alice", "uid1");
    expect(parseMentions(text)).toEqual(["uid1"]);
  });

  it("handles mention at start of string", () => {
    const content = "@[Alice](uid1)";
    expect(parseMentions(content)).toEqual(["uid1"]);
  });
});
