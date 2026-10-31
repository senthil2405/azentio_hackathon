import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEMO_PERSONAS, isDemoMode, isDemoPersona } from "@/server/demo/personas";

describe("demo persona switcher guard", () => {
  const original = process.env.DEMO_MODE;
  beforeEach(() => { delete process.env.DEMO_MODE; });
  afterEach(() => { process.env.DEMO_MODE = original; });
  it("is off unless DEMO_MODE=on", () => {
    expect(isDemoMode()).toBe(false);
    process.env.DEMO_MODE = "true";
    expect(isDemoMode()).toBe(false);
    process.env.DEMO_MODE = "on";
    expect(isDemoMode()).toBe(true);
  });
  it("only allows the seeded synthetic personas", () => {
    expect(isDemoPersona("maya.moderator@azentio.com")).toBe(true);
    expect(isDemoPersona(" ANA@northbank.example ")).toBe(true);
    expect(isDemoPersona("someone@azentio.com")).toBe(false);
    expect(isDemoPersona("real.person@gmail.com")).toBe(false);
    expect(DEMO_PERSONAS.every((p) => /@(azentio\.com|[a-z.]+\.example)$/.test(p.email))).toBe(true);
  });
});
