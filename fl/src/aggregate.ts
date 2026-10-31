import { DIM, SCHEMA_VERSION } from "./schema.ts";
import { l2 } from "./train.ts";

/** What a participant sends: a parameter delta and a sample count. Never training examples. */
export type Update = { participant: string; schemaVersion: string; baseVersion: string; delta: number[]; n: number };
export type Validated = Update & { clipped: boolean; norm: number };
export type Rejection = { participant: string; reason: string };

export const POLICY = {
  minParticipants: 2, // a round fails below this (approved for the demo; production value needs approval)
  clipNorm: 1.0, // bounded contribution per participant (L2)
  rejectNorm: 5.0, // updates this large are treated as anomalous/poisoned and excluded
  maxSamplesWeight: 0.6, // cap any single participant's share of the weighting
};

/** Validate shape, schema, base version and finiteness; clip to the norm bound; reject outliers. */
export function validate(updates: Update[], baseVersion: string): { accepted: Validated[]; rejected: Rejection[] } {
  const accepted: Validated[] = [];
  const rejected: Rejection[] = [];
  for (const u of updates) {
    if (u.schemaVersion !== SCHEMA_VERSION) { rejected.push({ participant: u.participant, reason: "schema_mismatch" }); continue; }
    if (u.baseVersion !== baseVersion) { rejected.push({ participant: u.participant, reason: "stale_base_model" }); continue; }
    if (!Array.isArray(u.delta) || u.delta.length !== DIM || !u.delta.every(Number.isFinite)) { rejected.push({ participant: u.participant, reason: "invalid_shape_or_values" }); continue; }
    if (!Number.isInteger(u.n) || u.n <= 0) { rejected.push({ participant: u.participant, reason: "invalid_sample_count" }); continue; }
    const norm = l2(u.delta);
    if (norm > POLICY.rejectNorm) { rejected.push({ participant: u.participant, reason: `norm_outlier(${norm.toFixed(2)})` }); continue; }
    const clipped = norm > POLICY.clipNorm;
    const delta = clipped ? u.delta.map((d) => (d * POLICY.clipNorm) / norm) : u.delta;
    accepted.push({ ...u, delta, clipped, norm: +norm.toFixed(4) });
  }
  return { accepted, rejected };
}

/** FedAvg weighted by sample count, with a per-participant weight cap so one large client can't dominate. */
export function fedAvg(global: number[], accepted: Validated[]): { params: number[]; weights: Record<string, number> } {
  const total = accepted.reduce((s, u) => s + u.n, 0);
  let w = accepted.map((u) => u.n / total);
  // cap and renormalise (one pass is enough for small cohorts)
  w = w.map((x) => Math.min(x, POLICY.maxSamplesWeight));
  const sum = w.reduce((s, x) => s + x, 0);
  w = w.map((x) => x / sum);
  const params = global.map((g, k) => g + accepted.reduce((s, u, i) => s + w[i] * u.delta[k], 0));
  return { params, weights: Object.fromEntries(accepted.map((u, i) => [u.participant, +w[i].toFixed(4)])) };
}
