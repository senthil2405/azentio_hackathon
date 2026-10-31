import { describe, expect, it } from "vitest";
import { SCENARIOS, scenarioFor } from "@/server/playground/scenarios";

const defaults = (slug: string) => Object.fromEntries(scenarioFor(slug)!.inputs.map((i) => [i.key, i.value]));

describe("playground scenarios", () => {
  it("are deterministic", () => {
    for (const s of SCENARIOS) {
      const a = s.run(defaults(s.slug), { seasonalAdjust: true });
      expect(s.run(defaults(s.slug), { seasonalAdjust: true })).toEqual(a);
    }
  });
  it("always carry a caveat that it is not a decision", () => {
    for (const s of SCENARIOS) expect(s.run(defaults(s.slug), { seasonalAdjust: false }).caveat).toMatch(/not/i);
  });
  it("seasonality-aware view lowers the SME indicator for a normal seasonal dip", () => {
    const s = scenarioFor("sme-credit-decisioning")!;
    const qoq = s.run(defaults(s.slug), { seasonalAdjust: false });
    const seasonal = s.run(defaults(s.slug), { seasonalAdjust: true });
    expect(seasonal.indicator).toBeLessThan(qoq.indicator);
  });
});
