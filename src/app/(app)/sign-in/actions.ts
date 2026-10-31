"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/server/rate-limit";
import { safeNext } from "@/server/auth/next-path";

export type SignInState = { step: "email" | "code"; email?: string; message?: string; error?: string };

const Email = z.string().trim().toLowerCase().email().max(254);
const Code = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.");

export async function requestCode(_: SignInState, form: FormData): Promise<SignInState> {
  const email = Email.safeParse(form.get("email"));
  if (!email.success) return { step: "email", error: "Enter a valid email address." };
  // 5 requests / 15 min per email+IP (plan.md D9).
  if (!(await rateLimit("otp", email.data, 5, 900))) {
    return { step: "email", error: "Too many attempts. Please wait a few minutes and try again." };
  }
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({ email: email.data, options: { shouldCreateUser: true } });
  // Same response whether or not the address has access (no account enumeration).
  return { step: "code", email: email.data, message: `If ${email.data} can sign in, a 6-digit code is on its way.` };
}

export async function verifyCode(state: SignInState, form: FormData): Promise<SignInState> {
  const email = Email.safeParse(form.get("email"));
  const code = Code.safeParse(form.get("code"));
  if (!email.success || !code.success) return { ...state, step: "code", error: "Enter the 6-digit code from your email." };
  if (!(await rateLimit("otp-verify", email.data, 10, 900))) {
    return { ...state, step: "code", error: "Too many attempts. Request a new code in a few minutes." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.data, token: code.data, type: "email" });
  if (error) return { ...state, step: "code", error: "That code is invalid or has expired." };
  // Bind a default workspace to this new session (the DB verifies membership).
  const { data: first } = await supabase.from("memberships").select("org_id").eq("status", "active").order("created_at").limit(1).maybeSingle();
  if (first) await supabase.rpc("set_active_org", { p_org: first.org_id });
  redirect(safeNext(form.get("next")));
}
