import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Grant, Membership, Principal } from "./policy";

/**
 * Loads the caller's identity, grants, memberships and session-bound active workspace.
 * Uses getUser() (verified with the Auth server) — never getSession() — for server decisions.
 * Every query runs with the user's JWT, so RLS limits what can be loaded.
 */
export const getPrincipal = cache(async (): Promise<Principal | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || user.id !== claims.sub) return null;

  const sessionId = typeof claims.session_id === "string" ? claims.session_id : null;
  const [grantsRes, membershipsRes, activeRes] = await Promise.all([
    supabase.from("role_grants").select("grant_kind").eq("user_id", user.id),
    supabase.from("memberships").select("org_id, client_role, organisations(name, kind)").eq("user_id", user.id).eq("status", "active"),
    sessionId
      ? supabase.from("active_workspaces").select("org_id").eq("user_id", user.id).eq("session_id", sessionId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const memberships: Membership[] = (membershipsRes.data ?? []).map((m) => {
    const org = m.organisations as unknown as { name: string; kind: "client" | "azentio" } | null;
    return { orgId: m.org_id, orgName: org?.name ?? "Unknown", kind: org?.kind ?? "client", clientRole: m.client_role };
  });
  const activeOrgId = activeRes.data?.org_id ?? null;

  return {
    userId: user.id,
    email: user.email ?? "",
    emailVerified: Boolean(user.email_confirmed_at),
    grants: new Set((grantsRes.data ?? []).map((g) => g.grant_kind as Grant)),
    memberships,
    activeOrgId: memberships.some((m) => m.orgId === activeOrgId) ? activeOrgId : null,
  };
});
