/**
 * Deterministic, synthetic demonstration scenarios (spec §05, FR-017). No real data, no model calls.
 * Outputs are illustrative only and must be rendered with the SyntheticLabel.
 */
export type Evidence = { label: string; value: string };
export type ScenarioResult = { headline: string; indicator: number; band: "lower" | "moderate" | "elevated"; evidence: Evidence[]; caveat: string };
export type Scenario = {
  slug: string;
  product: string;
  title: string;
  description: string;
  inputs: { key: string; label: string; value: number; unit: string }[];
  run: (inputs: Record<string, number>, options: { seasonalAdjust: boolean }) => ScenarioResult;
};

const band = (x: number): ScenarioResult["band"] => (x < 0.35 ? "lower" : x < 0.65 ? "moderate" : "elevated");
const clamp = (x: number) => Math.min(1, Math.max(0, Math.round(x * 100) / 100));

export const SCENARIOS: Scenario[] = [
  {
    slug: "sme-credit-decisioning",
    product: "SME Credit Decisioning Workbench",
    title: "Seasonal SME cash flow review",
    description: "A synthetic agricultural supplier with strong annual cash flow and two weak quarters. Compare a quarter-on-quarter view with a seasonality-aware view.",
    inputs: [
      { key: "q3_revenue", label: "Latest quarter revenue", value: 420, unit: "k (synthetic)" },
      { key: "q2_revenue", label: "Previous quarter revenue", value: 910, unit: "k (synthetic)" },
      { key: "same_q_last_year", label: "Same quarter last year", value: 400, unit: "k (synthetic)" },
      { key: "debt_service", label: "Quarterly debt service", value: 160, unit: "k (synthetic)" },
    ],
    run: (i, { seasonalAdjust }) => {
      const base = seasonalAdjust ? i.same_q_last_year : i.q2_revenue;
      const change = (i.q3_revenue - base) / base;
      const coverage = i.q3_revenue / i.debt_service;
      const indicator = clamp(0.5 - change * 0.6 - (coverage - 2) * 0.1);
      return {
        headline: seasonalAdjust ? "Seasonality-aware comparison: revenue in line with the same season last year." : "Quarter-on-quarter comparison: revenue appears to have fallen sharply.",
        indicator,
        band: band(indicator),
        evidence: [
          { label: "Comparison basis", value: seasonalAdjust ? "Same quarter last year" : "Previous quarter" },
          { label: "Revenue change vs basis", value: `${Math.round(change * 100)}%` },
          { label: "Debt-service coverage", value: `${coverage.toFixed(2)}×` },
        ],
        caveat: "Simulated indicator for demonstration. Not a credit score, recommendation or decision.",
      };
    },
  },
  {
    slug: "credit-strategy-simulator",
    product: "Credit Strategy Simulator",
    title: "Policy cut-off change",
    description: "Simulate raising a minimum coverage cut-off on a synthetic portfolio and inspect approvals vs exposure.",
    inputs: [
      { key: "applications", label: "Applications", value: 1000, unit: "count (synthetic)" },
      { key: "cutoff", label: "Minimum coverage cut-off", value: 1.4, unit: "×" },
      { key: "avg_exposure", label: "Average exposure", value: 85, unit: "k (synthetic)" },
    ],
    run: (i, { seasonalAdjust }) => {
      const approvalRate = clamp(1.15 - i.cutoff * 0.35 + (seasonalAdjust ? 0.06 : 0));
      const indicator = clamp(1 - approvalRate);
      return {
        headline: `${Math.round(approvalRate * 100)}% simulated approval rate at a ${i.cutoff}× cut-off.`,
        indicator,
        band: band(indicator),
        evidence: [
          { label: "Simulated approvals", value: `${Math.round(i.applications * approvalRate)}` },
          { label: "Simulated exposure", value: `${Math.round(i.applications * approvalRate * i.avg_exposure).toLocaleString()}k` },
          { label: "Seasonal adjustment", value: seasonalAdjust ? "On" : "Off" },
        ],
        caveat: "Simulated outcome on synthetic data. Not an approved policy change.",
      };
    },
  },
  {
    slug: "similar-portfolio-intelligence",
    product: "Similar Portfolio Intelligence",
    title: "Find a comparable segment",
    description: "Match a synthetic application to historical synthetic segments and inspect how similar they are.",
    inputs: [
      { key: "turnover", label: "Annual turnover", value: 2400, unit: "k (synthetic)" },
      { key: "years", label: "Years trading", value: 6, unit: "years" },
      { key: "seasonality", label: "Seasonality index", value: 0.7, unit: "0–1" },
    ],
    run: (i, { seasonalAdjust }) => {
      const similarity = clamp(0.55 + (seasonalAdjust ? i.seasonality * 0.35 : 0) - Math.abs(i.years - 7) * 0.02);
      return {
        headline: `Closest synthetic segment similarity: ${Math.round(similarity * 100)}%.`,
        indicator: clamp(1 - similarity),
        band: band(1 - similarity),
        evidence: [
          { label: "Segment", value: seasonalAdjust ? "Seasonal agri-suppliers (synthetic)" : "General SME traders (synthetic)" },
          { label: "Turnover band", value: i.turnover > 2000 ? "2–5m" : "<2m" },
          { label: "Seasonality used in matching", value: seasonalAdjust ? "Yes" : "No" },
        ],
        caveat: "Synthetic segments only. Similarity is illustrative and not a credit decision.",
      };
    },
  },
  {
    slug: "riva",
    product: "RIVA",
    title: "Report field mapping check",
    description: "Validate a synthetic regulatory report mapping and see which fields lack supporting evidence.",
    inputs: [
      { key: "fields", label: "Report fields", value: 48, unit: "count" },
      { key: "mapped", label: "Mapped fields", value: 44, unit: "count" },
      { key: "evidenced", label: "Fields with evidence", value: 39, unit: "count" },
    ],
    run: (i) => {
      const gap = clamp((i.fields - i.evidenced) / i.fields);
      return {
        headline: `${i.fields - i.mapped} unmapped and ${i.mapped - i.evidenced} mapped-but-unevidenced fields.`,
        indicator: gap,
        band: band(gap),
        evidence: [
          { label: "Mapping coverage", value: `${Math.round((i.mapped / i.fields) * 100)}%` },
          { label: "Evidence coverage", value: `${Math.round((i.evidenced / i.fields) * 100)}%` },
        ],
        caveat: "Synthetic report. Not a regulatory submission or validation.",
      };
    },
  },
];

export const scenarioFor = (slug: string) => SCENARIOS.find((s) => s.slug === slug);
