// Records the judge demo walkthrough to docs/demo/azentio-demo.mp4.
// Prereqs: local Supabase running with a fresh seed, `npm start` on :3000 with DEMO_MODE=on, ffmpeg on PATH.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const OUT = "docs/demo";
const TMP = join(OUT, ".raw");
mkdirSync(TMP, { recursive: true });

const browser = await chromium.launch({ slowMo: 120 });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: TMP, size: { width: 1280, height: 800 } } });
// Caption banner: drawn only on the page it describes (never carried across navigations).
await context.addInitScript(() => {
  window.__drawCaption = (text) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;max-width:1100px;padding:12px 20px;border-radius:10px;background:rgba(16,32,49,.92);color:#fff;font:600 17px/1.4 Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35);border-left:5px solid #69D393;pointer-events:none";
      document.documentElement.appendChild(el);
    }
    el.textContent = text;
  };
});
const page = await context.newPage();
const caption = async (text, hold = 2600) => {
  await page.evaluate((t) => window.__drawCaption?.(t), text);
  await page.waitForTimeout(hold);
};
const go = async (path) => { await page.goto(BASE + path); await page.waitForLoadState("load"); };
const scroll = async (px, steps = 6) => { for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, px / steps); await page.waitForTimeout(180); } };
const persona = async (role, label) => {
  await go("/sign-in");
  await caption(`Demo sign-in: ${label}`, 1800);
  await page.getByRole("button", { name: new RegExp(role) }).click();
  await page.waitForURL("**/portal");
  await page.waitForLoadState("load");
};
const signOut = async () => { await page.getByRole("button", { name: "Sign out" }).click(); await page.waitForURL(BASE + "/"); };

const SEASONAL = "Seasonal SME cash flow is penalised in ratio comparisons";
const RETAIL = "Retail SMEs flagged during pre-holiday inventory build";
const TOURISM = "Tourism businesses look riskier off-season than they are";

// 1 · Public website
await go("/");
await caption("azentio.ai — public website, ported from the reference prototype", 3000);
await scroll(1600, 10);
await caption("Public visitors see offerings, media and insights — no portal data", 2200);
await go("/products");
await caption("Product catalogue (static, served from the CDN)", 2200);
await go("/portal/moderation");
await caption("Protected routes redirect to sign-in — access is enforced on the server", 2800);

// 2 · Moderator reviews three observations from three client organisations
await persona("Learning moderator", "Maya, learning moderator (Azentio employee)");
await go("/portal/moderation");
await caption("Moderation queue: proposals from 3 synthetic client orgs. Drafts and org-only items never appear here.", 3600);
for (const [title, region, period, scrub] of [
  [SEASONAL, "South Asia", "2026-H1/H2", false],
  [RETAIL, "Middle East", "2026-Q3", false],
  [TOURISM, "South-East Asia", "2026-H1", true],
]) {
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await page.waitForLoadState("load");
  await caption(scrub ? "This one was auto-flagged: it contains a phone number" : "Moderator sees the private source and writes a reviewed, de-identified shared version", 2800);
  if (scrub) {
    const body = page.getByLabel("Shared summary");
    const text = (await body.inputValue()).replace(/\s*Contact:.*$/, "");
    await body.fill(text);
    await caption("Phone number removed from the shared version; region coarsened", 2400);
  }
  await page.getByLabel("Coarse region").fill(region);
  await page.getByLabel("Coarse period").fill(period);
  await page.getByRole("button", { name: "Publish reviewed version" }).click();
  await page.waitForURL("**/portal/moderation");
}
await caption("All three published. Only reviewed fields are shared — no author, org, or reviewer notes.", 3000);
await signOut();

// 3 · Product owner: theme + improvement idea
await persona("Product owner", "Priya, product owner (Azentio employee)");
await go("/portal/insights/themes/new");
await page.getByLabel("Theme").fill("Seasonality context");
await page.getByLabel("Relevant offering").selectOption("Financial Analysis Intelligence");
await page.getByLabel("Summary").fill("Seasonal SMEs are misread as deteriorating when compared quarter-on-quarter instead of against the same season.");
await page.getByLabel("Confidence & limitations").fill("Small sample of self-reported observations; not evidence of market prevalence.");
for (const t of [SEASONAL, RETAIL, TOURISM]) await page.getByLabel(new RegExp(t)).check();
await caption("Group approved evidence into a theme — with explicit limitations", 2400);
await page.getByRole("button", { name: "Save theme" }).click();
await page.waitForURL("**/portal/insights/themes/**");
await caption("3 distinct organisations contributed — counts shown only at or above the minimum cohort (3)", 3800);
await go("/portal/insights/ideas/new");
await page.getByLabel("Title").fill("Seasonality-aware comparison explanation");
await page.getByLabel("Problem statement (internal)").fill("Quarter-on-quarter comparisons misread normal seasonal dips as deterioration.");
await page.getByLabel("Offering").selectOption("Financial Analysis Intelligence");
await page.getByLabel("Owner / team").fill("FAI product team");
await page.getByLabel("Proposed outcome").fill("Explain comparisons against the same season last year.");
await page.getByLabel("Linked theme").selectOption({ label: "Seasonality context" });
await page.getByRole("button", { name: "Save idea" }).click();
await page.waitForURL("**/portal/insights/ideas/**");
await page.getByLabel(/^Status/).selectOption("under_review");
await page.getByLabel(/Public update/).fill("Being assessed by the FAI team. Not a delivery commitment.");
await page.getByRole("button", { name: "Update" }).click();
await page.waitForLoadState("load");
await caption("Idea moved to Under review — status change is audited; internal fields stay employee-only", 3200);
await signOut();

// 4 · Another client sees shared learning + status, not private data
await persona("Client member · Meridian", "Bea, client member at Meridian");
await go("/portal/learning?q=seasonal");
await caption("Client view: de-identified shared learning — 'contributor not identified'", 3200);
await go("/portal/insights");
await caption("Clients see the theme and the idea's plain-language status — not internal priority or discussion", 3400);
await signOut();

// 5 · Contributor withdraws; it disappears everywhere immediately
await persona("Client member · Northbank", "Ana, client member at Northbank (a contributor)");
await go("/portal/contributions");
await page.getByRole("link", { name: new RegExp(SEASONAL) }).click();
await page.waitForLoadState("load");
await caption("Ana can see who can view her contribution and how it may be used", 2800);
await page.getByRole("button", { name: "Withdraw" }).click();
await page.waitForLoadState("load");
await caption("Withdrawn: removed from search, themes and AIRA in the same transaction", 3000);
await signOut();
await persona("Client member · Meridian", "Bea again");
await go("/portal/learning?q=seasonal");
await caption("Bea's next search no longer shows it", 2600);
await go("/portal/insights");
await page.getByRole("link", { name: /Seasonality context/ }).first().click();
await page.waitForLoadState("load");
await caption("The theme now has only 2 organisations, so counts are automatically suppressed", 3600);
await signOut();

// 6 · Boundaries
await persona("Client member · Eastgate", "Cora at Eastgate (no SME sandbox entitlement)");
await go("/portal/moderation");
await caption("Knowing a URL isn't enough: moderation is a 404 for clients", 2600);
await go("/portal/playground/sme-credit-decisioning");
await caption("Non-entitled sandbox: 404", 2400);
await go("/portal/playground");
await caption("Entitled sandboxes only, with synthetic data clearly labelled", 2600);
await signOut();
await caption("Governed collective learning — server-enforced access, honest labels, immediate withdrawal.", 3500);

await page.close();
await context.close();
await browser.close();

const raw = readdirSync(TMP).find((f) => f.endsWith(".webm"));
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(TMP, raw), "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", join(OUT, "azentio-demo.mp4")]);
rmSync(TMP, { recursive: true, force: true });
console.log("saved", join(OUT, "azentio-demo.mp4"));
