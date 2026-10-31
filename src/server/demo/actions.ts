"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/server/rate-limit";
import { isDemoMode, isDemoPersona } from "./personas";

/** Signs in as a seeded synthetic persona through the normal OTP verification (code issued server-side). */
export async function demoSignIn(form: FormData): Promise<void> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!isDemoMode() || !isDemoPersona(email)) redirect("/sign-in");
  if (!(await rateLimit("demo-signin", email, 30, 900))) redirect("/sign-in");
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.email_otp) redirect("/sign-in");
  const supabase = await createClient();
  const { error: vErr } = await supabase.auth.verifyOtp({ email, token: data.properties.email_otp, type: "email" });
  if (vErr) redirect("/sign-in");
  console.info(JSON.stringify({ event: "demo.persona_sign_in", email, at: new Date().toISOString() }));
  const { data: first } = await supabase.from("memberships").select("org_id").eq("status", "active").order("created_at").limit(1).maybeSingle();
  if (first) await supabase.rpc("set_active_org", { p_org: first.org_id });
  redirect("/portal");
}
