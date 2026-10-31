import { describe, expect, it } from "vitest";
import { ContributionFields, sensitiveHints } from "@/server/learning/schema";

const base = {
  type: "product_gap", offering: "RIVA", industry: "SME lending", region: "Pune", period_start: "2026-07-01", period_end: "2026-09-30",
  evidence_type: "anecdotal", confidence: "low", title: "A valid title", body: "A sufficiently long synthetic description.", links: [],
};

describe("ContributionFields (mirrors DB constraints)", () => {
  it("accepts a valid observation", () => expect(ContributionFields.safeParse(base).success).toBe(true));
  it("rejects over-length and too-short fields", () => {
    expect(ContributionFields.safeParse({ ...base, title: "x".repeat(121) }).success).toBe(false);
    expect(ContributionFields.safeParse({ ...base, body: "short" }).success).toBe(false);
  });
  it("rejects a period that ends before it starts", () => {
    expect(ContributionFields.safeParse({ ...base, period_end: "2026-06-01" }).success).toBe(false);
  });
  it("rejects unknown enum values and non-URL links", () => {
    expect(ContributionFields.safeParse({ ...base, type: "gossip" }).success).toBe(false);
    expect(ContributionFields.safeParse({ ...base, links: ["javascript:alert(1)"] }).success).toBe(false);
  });
});

describe("sensitiveHints", () => {
  it("flags account numbers, emails and credentials", () => {
    expect(sensitiveHints("acct 123456789012")).toContain("a long number that could be an account number");
    expect(sensitiveHints("mail ops@bank.example")).toContain("an email address");
    expect(sensitiveHints("api_key: abc")).toContain("something that looks like a credential");
    expect(sensitiveHints("Seasonal pattern in Q3")).toEqual([]);
  });
});
