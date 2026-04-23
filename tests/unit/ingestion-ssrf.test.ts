import { describe, it, expect } from "vitest";
import { validateUrl } from "@/lib/modules/ingestion/extractors/url";

describe("validateUrl — SSRF protection", () => {
  it("accepts a valid public HTTPS URL", () => {
    expect(() => validateUrl("https://example.com/article")).not.toThrow();
  });

  it("accepts a valid public HTTP URL", () => {
    expect(() => validateUrl("http://example.com/page")).not.toThrow();
  });

  it("rejects ftp:// protocol", () => {
    expect(() => validateUrl("ftp://example.com/file.txt")).toThrow("Only HTTP and HTTPS");
  });

  it("rejects file:// protocol", () => {
    expect(() => validateUrl("file:///etc/passwd")).toThrow();
  });

  it("rejects localhost", () => {
    expect(() => validateUrl("http://localhost:3000/api/secret")).toThrow("blocked host");
  });

  it("rejects 127.0.0.1", () => {
    expect(() => validateUrl("http://127.0.0.1/admin")).toThrow("blocked host");
  });

  it("rejects ::1 IPv6 loopback", () => {
    expect(() => validateUrl("http://[::1]/")).toThrow("blocked host");
  });

  it("rejects 0.0.0.0", () => {
    expect(() => validateUrl("http://0.0.0.0/")).toThrow("blocked host");
  });

  it("rejects AWS metadata endpoint 169.254.169.254", () => {
    expect(() => validateUrl("http://169.254.169.254/latest/meta-data/")).toThrow("blocked host");
  });

  it("rejects 10.x private range", () => {
    expect(() => validateUrl("http://10.0.0.1/internal")).toThrow("private IP");
  });

  it("rejects 192.168.x private range", () => {
    expect(() => validateUrl("http://192.168.1.100/secret")).toThrow("private IP");
  });

  it("rejects 172.16.x–172.31.x private range", () => {
    expect(() => validateUrl("http://172.16.0.1/admin")).toThrow("private IP");
  });

  it("rejects malformed URL", () => {
    expect(() => validateUrl("not-a-url")).toThrow("Invalid URL");
  });

  it("returns a URL object for valid input", () => {
    const result = validateUrl("https://arxiv.org/abs/2304.01373");
    expect(result).toBeInstanceOf(URL);
    expect(result.hostname).toBe("arxiv.org");
  });
});
