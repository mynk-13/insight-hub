import { describe, it, expect } from "vitest";

/**
 * Pure-logic tests for invitation token validation rules.
 * The InvitationService itself requires a DB, so we test the invariants
 * that the service enforces as pure functions extracted below.
 */

function isExpired(expiresAt: Date): boolean {
  return expiresAt < new Date();
}

function emailsMatch(invitationEmail: string, userEmail: string): boolean {
  return invitationEmail.toLowerCase() === userEmail.toLowerCase();
}

function isValidPendingInvitation(status: string, expiresAt: Date): boolean {
  return status === "PENDING" && !isExpired(expiresAt);
}

function inviteTtlMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

describe("invitation expiry", () => {
  it("invitation in the past is expired", () => {
    const past = new Date(Date.now() - 1000);
    expect(isExpired(past)).toBe(true);
  });

  it("invitation in the future is not expired", () => {
    const future = new Date(Date.now() + inviteTtlMs(7));
    expect(isExpired(future)).toBe(false);
  });

  it("7-day TTL produces expiry 7 days from now", () => {
    const before = Date.now();
    const expiresAt = new Date(before + inviteTtlMs(7));
    const after = Date.now();
    const diff = expiresAt.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(inviteTtlMs(7));
    expect(diff).toBeLessThanOrEqual(inviteTtlMs(7) + (after - before));
  });

  it("48h TTL for ownership transfer", () => {
    const expiresAt = new Date(Date.now() + inviteTtlMs(2));
    expect(isExpired(expiresAt)).toBe(false);
  });
});

describe("email matching", () => {
  it("exact match passes", () => {
    expect(emailsMatch("alice@example.com", "alice@example.com")).toBe(true);
  });

  it("case-insensitive match passes", () => {
    expect(emailsMatch("Alice@Example.COM", "alice@example.com")).toBe(true);
  });

  it("different email fails", () => {
    expect(emailsMatch("alice@example.com", "bob@example.com")).toBe(false);
  });
});

describe("valid pending invitation", () => {
  it("PENDING + future expiry is valid", () => {
    expect(isValidPendingInvitation("PENDING", new Date(Date.now() + 1000))).toBe(true);
  });

  it("ACCEPTED invitation is not valid", () => {
    expect(isValidPendingInvitation("ACCEPTED", new Date(Date.now() + 1000))).toBe(false);
  });

  it("REVOKED invitation is not valid", () => {
    expect(isValidPendingInvitation("REVOKED", new Date(Date.now() + 1000))).toBe(false);
  });

  it("PENDING but expired is not valid", () => {
    expect(isValidPendingInvitation("PENDING", new Date(Date.now() - 1000))).toBe(false);
  });
});
