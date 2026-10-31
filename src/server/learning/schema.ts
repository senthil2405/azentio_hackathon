import { z } from "zod";

/** Shared client/server validation for contributions (spec FR-007, §07). Mirrors DB check constraints. */
export const CONTRIBUTION_TYPES = {
  market_observation: "Market observation",
  emerging_trend: "Emerging trend",
  product_gap: "Product gap",
  operational_challenge: "Operational challenge",
  successful_practice: "Successful practice",
  improvement_suggestion: "Improvement suggestion",
} as const;
export const EVIDENCE_TYPES = {
  anecdotal: "Anecdotal",
  internal_data: "Internal data (aggregated)",
  customer_feedback: "Customer feedback",
  market_research: "Market research",
  regulatory_change: "Regulatory change",
} as const;
export const CONFIDENCE = { low: "Low", medium: "Medium", high: "High" } as const;
export const OFFERINGS = [
  "Credit Strategy Simulator",
  "SME Credit Decisioning Workbench",
  "Similar Portfolio Intelligence",
  "RIVA",
  "Financial Analysis Intelligence",
] as const;

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.");

export const ContributionFields = z
  .object({
    type: z.enum(keys(CONTRIBUTION_TYPES)),
    offering: z.enum(OFFERINGS),
    industry: z.string().trim().min(2, "Industry is required.").max(80),
    region: z.string().trim().min(2, "Region is required.").max(80),
    period_start: isoDate,
    period_end: isoDate,
    evidence_type: z.enum(keys(EVIDENCE_TYPES)),
    confidence: z.enum(keys(CONFIDENCE)),
    title: z.string().trim().min(5, "Title needs at least 5 characters.").max(120, "Title is limited to 120 characters."),
    body: z.string().trim().min(20, "Describe the observation in at least 20 characters.").max(4000, "Limited to 4,000 characters."),
    links: z
      .array(
        z.string().trim().max(500).refine((u) => {
          try {
            return ["http:", "https:"].includes(new URL(u).protocol);
          } catch {
            return false;
          }
        }, "Links must be full http(s) URLs."),
      )
      .max(5)
      .default([]),
  })
  .refine((f) => f.period_end >= f.period_start, { path: ["period_end"], message: "End must be on or after the start." });
export type ContributionFields = z.infer<typeof ContributionFields>;

export const Visibility = z.enum(["author_only", "org", "propose_community"]);

/** Reads the contribution form; links come as a newline-separated textarea. */
export function readContributionForm(form: FormData) {
  return ContributionFields.safeParse({
    type: form.get("type"),
    offering: form.get("offering"),
    industry: form.get("industry"),
    region: form.get("region"),
    period_start: form.get("period_start"),
    period_end: form.get("period_end"),
    evidence_type: form.get("evidence_type"),
    confidence: form.get("confidence"),
    title: form.get("title"),
    body: form.get("body"),
    links: String(form.get("links") ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
  });
}

/** Client-side mirror of the DB heuristic (private.flag_sensitive) for immediate feedback. Not a guarantee. */
export function sensitiveHints(text: string): string[] {
  const hints: [RegExp, string][] = [
    [/\b\d{8,18}\b/, "a long number that could be an account number"],
    [/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/i, "something that looks like an IBAN"],
    [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, "an email address"],
    [/\+?\d[\d ()-]{8,}\d/, "a phone number"],
    [/(password|passwd|api[_ -]?key|secret|token)\s*[:=]/i, "something that looks like a credential"],
  ];
  return hints.filter(([re]) => re.test(text)).map(([, label]) => label);
}
