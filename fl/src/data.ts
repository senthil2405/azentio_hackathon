import { type Example } from "./schema.ts";

/** Deterministic PRNG (mulberry32) so every run and test is reproducible. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());

/**
 * Synthetic SME population. The true risk depends on the seasonality-aware revenue change and coverage,
 * NOT on the quarter-on-quarter change. Clients differ in how seasonal their portfolios are (skew).
 */
export function generate(n: number, seed: number, seasonality: number, defaultBias = 0): Example[] {
  const r = rng(seed);
  const out: Example[] = [];
  for (let i = 0; i < n; i++) {
    const seasonal = Math.min(1, Math.max(0, seasonality + 0.15 * gauss(r)));
    const trueChange = 0.25 * gauss(r); // real business change vs same season
    const qoq = trueChange - seasonal * (0.4 + 0.2 * r()); // seasonal dip pollutes the naive comparison
    const coverage = 1.6 + 0.6 * gauss(r);
    const years = Math.max(0, 6 + 4 * gauss(r));
    const logit = -1.4 - 3.2 * trueChange - 1.5 * (coverage - 1.6) - 0.05 * (years - 6) + defaultBias;
    const y = r() < 1 / (1 + Math.exp(-logit)) ? 1 : 0;
    // Standardise features approximately to unit scale (part of the shared schema contract).
    out.push({ x: [trueChange / 0.25, qoq / 0.35, (coverage - 1.6) / 0.6, (seasonal - 0.5) / 0.3, (years - 6) / 4], y });
  }
  return out;
}

/** Three participants with deliberately skewed distributions + a separate holdout. */
export const PARTICIPANTS = [
  { id: "client-northbank", label: "Northbank Lending (synthetic) — agri-seasonal portfolio", n: 900, seed: 11, seasonality: 0.8, bias: 0.0 },
  { id: "client-meridian", label: "Meridian Commercial Bank (synthetic) — retail, mild seasonality", n: 600, seed: 22, seasonality: 0.35, bias: -0.3 },
  { id: "client-eastgate", label: "Eastgate Finance (synthetic) — tourism, strong seasonality", n: 300, seed: 33, seasonality: 0.9, bias: 0.4 },
] as const;
export const HOLDOUT = { n: 1500, seed: 99, seasonality: 0.6, bias: 0 };
