import "server-only";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { ExtractionResult } from "../types";

const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
  "169.254.169.254", // AWS metadata
  "metadata.google.internal",
];

const PRIVATE_IP_REGEX =
  /^(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i;

export function validateUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new Error("URL points to a blocked host");
  }

  if (PRIVATE_IP_REGEX.test(hostname)) {
    throw new Error("URL resolves to a private IP range");
  }

  return parsed;
}

async function checkRobotsTxt(parsedUrl: URL): Promise<void> {
  const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
  try {
    const res = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(3000),
      headers: { "User-Agent": "InsightHubBot/1.0" },
    });
    if (!res.ok) return;
    const text = await res.text();
    // Check for Disallow: / under User-agent: * or InsightHubBot
    const lines = text.split("\n").map((l) => l.trim());
    let inRelevantAgent = false;
    for (const line of lines) {
      if (/^user-agent:\s*(\*|InsightHubBot)/i.test(line)) {
        inRelevantAgent = true;
      } else if (/^user-agent:/i.test(line)) {
        inRelevantAgent = false;
      } else if (inRelevantAgent && /^disallow:\s*\/\s*$/i.test(line)) {
        throw new Error("robots.txt disallows crawling this site");
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("robots.txt")) throw err;
    // Ignore network errors fetching robots.txt
  }
}

export async function extractUrl(rawUrl: string): Promise<ExtractionResult & { title?: string }> {
  const parsed = validateUrl(rawUrl);
  await checkRobotsTxt(parsed);

  const res = await fetch(rawUrl, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "InsightHubBot/1.0",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

  const html = await res.text();
  const dom = new JSDOM(html, { url: rawUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article?.textContent) throw new Error("Could not extract readable content from URL");

  const text = article.textContent.trim();
  return {
    text,
    title: article.title ?? undefined,
    pageCount: null,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    usedOcr: false,
  };
}
