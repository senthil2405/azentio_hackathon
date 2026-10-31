"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/server/authz/policy";
import { getPrincipal } from "@/server/authz/principal";

export type InsightState = { error?: string };
const uuids = (form: FormData, key: string) => form.getAll(key).map(String).filter((v) => z.string().uuid().safeParse(v).success);

export async function saveTheme(_: InsightState, form: FormData): Promise<InsightState> {
  if (!authorize(await getPrincipal(), "themes.manage").allowed) return { error: "You don’t have permission to manage themes." };
  const parsed = z
    .object({ title: z.string().trim().min(3).max(120), summary: z.string().max(2000), limitations: z.string().max(1000), offering: z.string().max(80) })
    .safeParse({ title: form.get("title"), summary: form.get("summary") ?? "", limitations: form.get("limitations") ?? "", offering: form.get("offering") ?? "" });
  if (!parsed.success) return { error: "A theme needs a title (3–120 characters)." };
  const id = z.string().uuid().safeParse(form.get("id"));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("theme_save", {
    p_theme: id.success ? id.data : null,
    p_title: parsed.data.title,
    p_summary: parsed.data.summary,
    p_limitations: parsed.data.limitations,
    p_offering: parsed.data.offering || null,
    p_evidence: uuids(form, "evidence"),
  });
  if (error) return { error: "Could not save the theme." };
  revalidatePath("/portal/insights");
  redirect(`/portal/insights/themes/${data}`);
}

const IdeaFields = z.object({
  title: z.string().trim().min(5).max(120),
  problem: z.string().trim().min(10).max(2000),
  offering: z.string().trim().min(2).max(80),
  proposed_outcome: z.string().trim().min(10).max(2000),
  owner_team: z.string().trim().min(2).max(80),
  priority: z.enum(["low", "medium", "high"]),
  theme_id: z.string().uuid().or(z.literal("")),
});

export async function saveIdea(_: InsightState, form: FormData): Promise<InsightState> {
  if (!authorize(await getPrincipal(), "ideas.manage").allowed) return { error: "Only product owners can manage improvement ideas." };
  const f = IdeaFields.safeParse(Object.fromEntries(["title", "problem", "offering", "proposed_outcome", "owner_team", "priority", "theme_id"].map((k) => [k, form.get(k) ?? ""])));
  if (!f.success) return { error: "Fill in title, problem, offering, proposed outcome and owner team (minimum lengths apply)." };
  const id = z.string().uuid().safeParse(form.get("id"));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("idea_save", { p_idea: id.success ? id.data : null, p: f.data, p_evidence: uuids(form, "evidence") });
  if (error) return { error: "Could not save the idea." };
  revalidatePath("/portal/insights");
  redirect(`/portal/insights/ideas/${data}`);
}

export async function setIdeaStatus(form: FormData): Promise<void> {
  const id = z.string().uuid().parse(form.get("id"));
  const status = z.enum(["proposed", "under_review", "planned", "in_progress", "released", "not_proceeding"]).parse(form.get("status"));
  const note = z.string().max(1000).parse(String(form.get("public_note") ?? ""));
  const supabase = await createClient();
  await supabase.rpc("idea_set_status", { p_idea: id, p_status: status, p_public_note: note });
  revalidatePath(`/portal/insights/ideas/${id}`);
  revalidatePath("/portal/insights");
}
