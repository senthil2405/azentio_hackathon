import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./helpers";

test.describe.configure({ mode: "serial" });

test("A1: public site is open; portal, legacy admin routes and protected media are not", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Build Intelligence.");
  for (const path of ["/portal", "/playground", "/live", "/configurator"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in/);
  }
  const media = await request.get("/api/media/40000000-0000-4000-d000-000000000001");
  expect(media.status()).toBe(404);
});

test("Public demo request is stored and honestly labelled", async ({ page }) => {
  await page.goto("/connect");
  await page.locator('input[name="name"]').fill("Test Visitor");
  await page.locator('input[name="email"]').fill("visitor@example.com");
  await page.locator('textarea[name="message"]').fill("Interested in a demo of the workbench.");
  await page.getByRole("button", { name: /Submit Enquiry/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "received" })).toBeVisible();
  await expect(page.getByText(/email delivered/i)).toHaveCount(0);
});

test("A14: illustrative scenario — contribute, moderate, publish, search, withdraw", async ({ page }) => {
  const title = `E2E seasonal observation ${Date.now()}`;

  // Client contributes and proposes to the community.
  await signIn(page, "ana@northbank.example");
  await expect(page.getByText("Northbank Lending (synthetic)").first()).toBeVisible();
  await page.goto("/portal/contributions/new");
  await page.getByLabel("Industry").fill("SME lending");
  await page.getByLabel("Region").fill("Pune district");
  await page.getByLabel("Observation period start").fill("2026-07-01");
  await page.getByLabel("Observation period end").fill("2026-09-30");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("What did you observe?").fill("Seasonal dips are misread as deterioration in quarter-on-quarter comparisons.");
  await page.getByLabel("Propose to the learning community").check();
  await page.getByLabel(/Publish a moderator-reviewed/).check();
  await page.getByRole("button", { name: "Save and submit for review" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("Submitted", { exact: true }).first()).toBeVisible();
  const contributionUrl = page.url();
  await signOut(page);

  // Moderator publishes a de-identified version.
  await signIn(page, "maya.moderator@azentio.com", "/portal/moderation");
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await page.getByLabel("Coarse region").fill("South Asia");
  await page.getByRole("button", { name: "Publish reviewed version" }).click();
  await page.waitForURL("**/portal/moderation");
  await signOut(page);

  // Another organisation finds it in shared learning (without the contributor identity).
  await signIn(page, "bea@meridian.example", "/portal/learning");
  await page.getByPlaceholder("Search observations…").fill("seasonal misread");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("contributor not identified").first()).toBeVisible();
  await signOut(page);

  // Author withdraws; it disappears for others on the next request.
  await signIn(page, "ana@northbank.example", new URL(contributionUrl).pathname);
  await page.getByRole("button", { name: "Withdraw" }).click();
  await expect(page.getByText("Withdrawn", { exact: true }).first()).toBeVisible();
  await signOut(page);
  await signIn(page, "bea@meridian.example", `/portal/learning?q=${encodeURIComponent("seasonal misread")}`);
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
});

test("Clients cannot reach employee or moderator areas by URL", async ({ page }) => {
  await signIn(page, "cora@eastgate.example");
  for (const path of ["/portal/moderation", "/portal/live", "/portal/members", "/portal/playground/sme-credit-decisioning"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
});

test("Unapproved @azentio.com account gets no workspace", async ({ page }) => {
  await signIn(page, "newhire@azentio.com");
  await expect(page.getByText("No workspace yet")).toBeVisible();
});

test("A12: AIRA never returns employee-only content to clients; employees can retrieve it", async ({ page }) => {
  const ask = async () =>
    (await (await page.request.post("/api/aira", { data: { question: "prototype notes workbench" } })).json()) as { citations?: { title: string }[] };

  expect((await page.request.post("/api/aira", { data: { question: "prototype notes" } })).status()).toBe(401);

  await signIn(page, "cora@eastgate.example");
  const client = await ask();
  expect((client.citations ?? []).map((c) => c.title).join(" ")).not.toContain("Internal");
  await signOut(page);

  await signIn(page, "alex.employee@azentio.com");
  const employee = await ask();
  expect((employee.citations ?? []).map((c) => c.title)).toContain("Internal: prototype notes for SME Workbench v0.4");
});
