// Usage: node scripts/capture.mjs <baseUrl> <outDir> [route ...]
// Full-page screenshots at desktop (1440) and mobile (390) widths, after scrolling to trigger lazy/reveal content.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [base, out, ...routes] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [label, width] of [["desktop", 1440], ["mobile", 390]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const route of routes.length ? routes : ["/"]) {
    await page.goto(new URL(route, base).toString(), { waitUntil: "load" });
    for (let y = 0; y < 20000; y += 600) {
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(800);
    const name = (route.replace(/\//g, "_").replace(/^_|_$/g, "") || "home") + `.${label}.png`;
    await page.screenshot({ path: `${out}/${name}`, fullPage: true });
    console.log("saved", name);
  }
  await page.close();
}
await browser.close();
