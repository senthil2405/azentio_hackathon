"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/server/authz/policy";
import { getPrincipal } from "@/server/authz/principal";
import { readContributionForm, Visibility } from "./schema";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: string };

const ERRORS: Record<string, string> = {
  invalid_transition: "That action isn’t available in the contribution’s current state.",
  consent_publish_required: "Proposing to the learning community needs your permission to publish a reviewed version.",
  consent_store_required: "We need permission to store and process your contribution.",
  consent_attribution_required: "Attribution needs the contributor’s explicit consent.",
  reason_required: "Give the contributor a short reason.",
  reviewed_fields_required: "Fill in the reviewed shared version before publishing.",
  no_active_workspace: "Choose a workspace first.",
  forbidden: "You don’t have permission to do that.",
  not_found: "Not found.",
};
const message = (e: { message: string } | null) => (e ? (ERRORS[e.message] ?? "Something went wrong. Please try again.") : undefined);

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return Object.fromEntries(issues.map((i) => [String(i.path[0]), i.message]));
}

/** Create a private draft, then optionally apply the chosen sharing (never shared by Save alone). */
export async function createContribution(_: FormState, form: FormData): Promise<FormState> {
  const principal = await getPrincipal();
  if (!authorize(principal, "learning.contribute").allowed) return { error: ERRORS.forbidden };
  const fields = readContributionForm(form);
  if (!fields.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(fields.error.issues) };
  const visibility = Visibility.catch("author_only").parse(form.get("visibility"));
  const intent = form.get("intent") === "share" ? "share" : "save";
  const consents = {
    store_process: form.get("consent_store") === "on",
    publish_shared: form.get("consent_publish") === "on",
    attribution: form.get("consent_attribution") === "on",
    training: form.get("consent_training") === "on",
  };
  if (!consents.store_process) return { error: ERRORS.consent_store_required };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("contribution_create", { p_fields: fields.data, p_consents: consents });
  if (error) return { error: message(error) };

  if (intent === "share" && visibility !== "author_only") {
    const action = visibility === "org" ? "share_org" : "submit";
    const { error: e2 } = await supabase.rpc("contribution_author_action", { p_contribution: id, p_action: action });
    if (e2) return { error: `Saved as a private draft, but sharing failed: ${message(e2)}` };
  }
  revalidatePath("/portal/contributions");
  redirect(`/portal/contributions/${id}`);
}

const AuthorAction = z.enum(["share_org", "submit", "resubmit", "withdraw"]);

export async function authorAction(form: FormData): Promise<void> {
  const id = z.string().uuid().parse(form.get("id"));
  const action = AuthorAction.parse(form.get("action"));
  const supabase = await createClient();
  const consents = form.get("consent_publish") === "on" ? { publish_shared: true } : null;
  await supabase.rpc("contribution_author_action", { p_contribution: id, p_action: action, p_consents: consents });
  revalidatePath(`/portal/contributions/${id}`);
  revalidatePath("/portal/learning");
  revalidatePath("/portal/insights");
}

/** Edit a draft/returned item, or submit a material revision of a published one (re-review). */
export async function editContribution(_: FormState, form: FormData): Promise<FormState> {
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { error: ERRORS.not_found };
  const fields = readContributionForm(form);
  if (!fields.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(fields.error.issues) };
  const supabase = await createClient();
  const { data: c } = await supabase.from("contributions").select("state").eq("id", id.data).maybeSingle();
  if (!c) return { error: ERRORS.not_found };
  const { error } =
    c.state === "published"
      ? await supabase.rpc("contribution_author_action", { p_contribution: id.data, p_action: "edit", p_fields: fields.data })
      : await supabase.rpc("contribution_update_draft", { p_contribution: id.data, p_fields: fields.data });
  if (error) return { error: message(error) };
  revalidatePath(`/portal/contributions/${id.data}`);
  redirect(`/portal/contributions/${id.data}`);
}

const ModAction = z.enum(["publish", "request_clarification", "reject", "unpublish", "republish", "remove"]);

export async function moderate(_: FormState, form: FormData): Promise<FormState> {
  const principal = await getPrincipal();
  if (!authorize(principal, "moderation").allowed) return { error: ERRORS.forbidden };
  const id = z.string().uuid().safeParse(form.get("id"));
  const action = ModAction.safeParse(form.get("action"));
  if (!id.success || !action.success) return { error: ERRORS.not_found };
  const shared =
    action.data === "publish"
      ? z
          .object({
            title: z.string().trim().min(5).max(120),
            body: z.string().trim().min(20).max(4000),
            region_coarse: z.string().trim().min(2).max(80),
            period_coarse: z.string().trim().min(4).max(20),
            attribute: z.boolean(),
          })
          .safeParse({
            title: form.get("shared_title"),
            body: form.get("shared_body"),
            region_coarse: form.get("region_coarse"),
            period_coarse: form.get("period_coarse"),
            attribute: form.get("attribute") === "on",
          })
      : null;
  if (shared && !shared.success) return { error: "Complete the reviewed shared version (title, body, coarse region and period)." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("contribution_moderate", {
    p_contribution: id.data,
    p_action: action.data,
    p_public_reason: String(form.get("public_reason") ?? "") || null,
    p_private_note: String(form.get("private_note") ?? "") || null,
    p_shared: shared?.data ?? null,
  });
  if (error) return { error: message(error) };
  revalidatePath("/portal/moderation");
  revalidatePath("/portal/learning");
  redirect("/portal/moderation");
}

export async function reportShared(_: FormState, form: FormData): Promise<FormState> {
  const id = z.string().uuid().safeParse(form.get("id"));
  const reason = z.string().trim().min(10, "Explain the concern in at least 10 characters.").max(1000).safeParse(form.get("reason"));
  if (!id.success) return { error: ERRORS.not_found };
  if (!reason.success) return { error: reason.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_create", { p_shared_rep: id.data, p_reason: reason.data });
  if (error) return { error: message(error) };
  return { ok: "Thanks. A moderator will review this. Your identity is not shared with the contributor." };
}

export async function resolveReport(form: FormData): Promise<void> {
  const id = z.string().uuid().parse(form.get("id"));
  const supabase = await createClient();
  await supabase.rpc("report_resolve", { p_report: id, p_uphold: form.get("uphold") === "true", p_note: String(form.get("note") ?? "") });
  revalidatePath("/portal/moderation");
}
