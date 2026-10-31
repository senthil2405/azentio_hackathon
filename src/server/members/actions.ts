"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/server/authz/policy";
import { getPrincipal } from "@/server/authz/principal";

export type InviteState = { error?: string; link?: string; email?: string };

export async function inviteMember(_: InviteState, form: FormData): Promise<InviteState> {
  if (!authorize(await getPrincipal(), "client.admin").allowed) return { error: "Only client administrators can invite members." };
  const email = z.string().trim().toLowerCase().email().max(254).safeParse(form.get("email"));
  const role = z.enum(["member", "client_admin"]).safeParse(form.get("role")); // platform roles are not even selectable
  if (!email.success || !role.success) return { error: "Enter a valid email and role." };
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_invitation", { p_email: email.data, p_role: role.data });
  if (error) return { error: "Could not create the invitation." };
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  revalidatePath("/portal/members");
  // Email delivery is P1: the single-use link is shown once so the admin can send it.
  return { link: `${origin}/invite/${token}`, email: email.data };
}

export async function updateMember(form: FormData): Promise<void> {
  const user = z.string().uuid().parse(form.get("user"));
  const role = z.enum(["member", "client_admin"]).parse(form.get("role"));
  const active = form.get("active") === "true";
  const supabase = await createClient();
  await supabase.rpc("set_member_role", { p_user: user, p_role: role, p_active: active });
  revalidatePath("/portal/members");
}

export async function revokeInvite(form: FormData): Promise<void> {
  const id = z.string().uuid().parse(form.get("id"));
  const supabase = await createClient();
  await supabase.rpc("revoke_invitation", { p_invitation: id });
  revalidatePath("/portal/members");
}
