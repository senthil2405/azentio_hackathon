/**
 * Learning task (synthetic): predict whether an SME loan becomes 60+ days past due within 12 months.
 * Feature schema v1 — every participant MUST produce exactly these standardised features, in this order.
 * Compatibility: updates carrying a different schemaVersion or vector length are rejected.
 */
export const SCHEMA_VERSION = "sme-default-v1";
export const FEATURES = [
  "revenue_change_vs_same_season", // seasonality-aware comparison
  "revenue_change_vs_prev_quarter", // naive quarter-on-quarter comparison
  "debt_service_coverage",
  "seasonality_index",
  "years_trading",
] as const;
export const DIM = FEATURES.length + 1; // + bias

export type Example = { x: number[]; y: 0 | 1 };
/** Logistic regression parameters: weights for each feature followed by the bias term. */
export type Model = { version: string; schemaVersion: string; params: number[] };

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
export const predict = (params: number[], x: number[]) =>
  sigmoid(x.reduce((s, xi, i) => s + xi * params[i], params[DIM - 1]));
