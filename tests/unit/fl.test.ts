import { describe, expect, it } from "vitest";
import { POLICY, fedAvg, validate, type Update } from "../../fl/src/aggregate";
import { DIM, SCHEMA_VERSION } from "../../fl/src/schema";

const upd = (participant: string, delta: number[], n = 100, extra: Partial<Update> = {}): Update => ({ participant, schemaVersion: SCHEMA_VERSION, baseVersion: "v0", delta, n, ...extra });
const vec = (x: number) => new Array(DIM).fill(x);

describe("FL update validation", () => {
  it("rejects schema mismatch, stale base, bad shape and non-finite values", () => {
    const { rejected } = validate([
      upd("a", vec(0.1), 100, { schemaVersion: "other" }),
      upd("b", vec(0.1), 100, { baseVersion: "v-old" }),
      upd("c", [0.1, 0.2]),
      upd("d", [...vec(0.1).slice(1), Number.NaN]),
    ], "v0");
    expect(rejected.map((r) => r.reason)).toEqual(["schema_mismatch", "stale_base_model", "invalid_shape_or_values", "invalid_shape_or_values"]);
  });
  it("clips large updates to the norm bound and rejects outliers (poisoning check)", () => {
    const { accepted, rejected } = validate([upd("ok", vec(0.1)), upd("big", vec(1)), upd("poison", vec(10))], "v0");
    expect(accepted.find((u) => u.participant === "big")!.clipped).toBe(true);
    const n = Math.sqrt(accepted.find((u) => u.participant === "big")!.delta.reduce((s, x) => s + x * x, 0));
    expect(n).toBeCloseTo(POLICY.clipNorm, 6);
    expect(rejected[0].participant).toBe("poison");
  });
});

describe("FedAvg", () => {
  it("weights by sample count with a per-participant cap", () => {
    const { accepted } = validate([upd("large", vec(0.1), 900), upd("small", vec(-0.1), 100)], "v0");
    const { weights, params } = fedAvg(vec(0), accepted);
    expect(weights.large).toBeLessThanOrEqual(POLICY.maxSamplesWeight / (POLICY.maxSamplesWeight + 0.1) + 1e-9);
    expect(params[0]).toBeGreaterThan(0);
  });
});
