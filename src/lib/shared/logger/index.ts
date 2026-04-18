import { z } from "zod";

const LogLevelSchema = z.enum(["debug", "info", "warn", "error"]);
type LogLevel = z.infer<typeof LogLevelSchema>;

const LogEntrySchema = z.object({
  level: LogLevelSchema,
  message: z.string(),
  timestamp: z.string().datetime(),
  context: z.record(z.string(), z.unknown()).optional(),
});
type LogEntry = z.infer<typeof LogEntrySchema>;

// Patterns that match bare values (replaced directly)
const VALUE_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  /\b\d{10,12}\b/g,
];

// Patterns for JSON key:value pairs — replacement must keep valid JSON
const JSON_FIELD_PATTERNS = [
  /"password"\s*:\s*"[^"]*"/gi,
  /"token"\s*:\s*"[^"]*"/gi,
  /"secret"\s*:\s*"[^"]*"/gi,
  /"key"\s*:\s*"[^"]*"/gi,
];

function redactPII(value: string): string {
  let s = VALUE_PATTERNS.reduce((acc, p) => acc.replace(p, "[REDACTED]"), value);
  s = JSON_FIELD_PATTERNS.reduce(
    (acc, p) => acc.replace(p, (match) => match.replace(/"[^"]*"$/, '"[REDACTED]"')),
    s,
  );
  return s;
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify({
    ...entry,
    message: redactPII(entry.message),
    context: entry.context ? JSON.parse(redactPII(JSON.stringify(entry.context))) : undefined,
  });
}

function createLogger() {
  const log = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    const entry = LogEntrySchema.parse({
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    });
    const formatted = formatEntry(entry);
    if (level === "error") {
      console.error(formatted);
    } else if (level === "warn") {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  };

  return {
    debug: (msg: string, ctx?: Record<string, unknown>) => log("debug", msg, ctx),
    info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
    warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
    error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),
  };
}

export const logger = createLogger();
export type { LogLevel, LogEntry };
