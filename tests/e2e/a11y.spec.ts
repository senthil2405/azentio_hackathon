import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

/** Dependency-free WCAG smoke checks (Lighthouse/axe were not installed by owner decision). */
async function audit(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = [];
    if (!document.documentElement.lang) problems.push("html lang missing");
    const h1 = document.querySelectorAll("h1").length;
    if (h1 !== 1) problems.push(`expected 1 h1, found ${h1}`);
    document.querySelectorAll("img").forEach((img) => {
      if (!img.hasAttribute("alt")) problems.push(`img without alt: ${img.getAttribute("src")}`);
    });
    document.querySelectorAll("input:not([type=hidden]), select, textarea").forEach((el) => {
      const e = el as HTMLInputElement;
      if (e.tabIndex === -1 || e.closest("[aria-hidden=true]")) return; // honeypot / hidden
      const labelled = (e.id && document.querySelector(`label[for="${e.id}"]`)) || e.closest("label") || e.getAttribute("aria-label") || e.getAttribute("aria-labelledby");
      if (!labelled) problems.push(`unlabelled ${e.tagName.toLowerCase()} name=${e.name}`);
    });
    document.querySelectorAll("button, a[href]").forEach((el) => {
      const name = (el.textContent ?? "").trim() || el.getAttribute("aria-label") || el.getAttribute("title");
      if (!name) problems.push(`control without accessible name: ${el.outerHTML.slice(0, 80)}`);
    });
    return problems;
  });
}

const PUBLIC = ["/", "/products", "/products/riva", "/solutions", "/media", "/insights", "/about", "/lab", "/technology", "/hackathon/register", "/connect", "/sign-in"];

test("public pages pass accessibility smoke checks", async ({ page }) => {
  for (const path of PUBLIC) {
    await page.goto(path);
    expect(await audit(page), path).toEqual([]);
  }
});

test("portal pages pass accessibility smoke checks", async ({ page }) => {
  await signIn(page, "carl.admin@northbank.example");
  for (const path of ["/portal", "/portal/contributions", "/portal/contributions/new", "/portal/learning", "/portal/insights", "/portal/members", "/portal/playground", "/portal/notifications"]) {
    await page.goto(path);
    expect(await audit(page), path).toEqual([]);
  }
});
