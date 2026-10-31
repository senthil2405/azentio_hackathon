"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/server/rate-limit";

const MESSAGES: Record<string, string> = {
  invitation_invalid: "This invitation is invalid, expired, revoked or already used. Ask your administrator for a new one.",
  invitation_wrong_account: "This invitation was sent to a different email address. Sign in with the invited address.",
};

export async function acceptInvitation(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const token = String(form.get("token") ?? "");
  if (!/^[a-f0-9]{64}$/.test(token)) return { error: MESSAGES.invitation_invalid };
  if (!(await rateLimit("invite", token.slice(0, 12), 10, 900))) return { error: "Too many attempts. Try again later." };
  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: MESSAGES[error.message] ?? "We couldn’t accept this invitation." };
  await supabase.rpc("set_active_org", { p_org: orgId });
  redirect("/onboarding");
}
