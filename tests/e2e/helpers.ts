import { expect, type Page } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54324";

/** Reads the newest sign-in code sent to `email` from the local Mailpit inbox. */
async function latestCode(email: string, after: number): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=5`);
    const { messages = [] } = (await res.json()) as { messages?: { ID: string; Created: string }[] };
    const fresh = messages.find((m) => new Date(m.Created).getTime() >= after - 2000);
    if (fresh) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json()) as { Text: string };
      const code = msg.Text.match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No sign-in code for ${email}`);
}

/** Real email-OTP sign-in through the UI. */
export async function signIn(page: Page, email: string, next = "/portal") {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  // Supabase enforces a minimum interval between emails to the same user (auth.email.max_frequency).
  await page.waitForTimeout(1200);
  const started = Date.now();
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await expect(page.getByLabel("6-digit code")).toBeVisible();
  await page.getByLabel("6-digit code").fill(await latestCode(email, started));
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/");
}
