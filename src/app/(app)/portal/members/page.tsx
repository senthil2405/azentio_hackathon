import { Card, PageHeader, StatusChip, SubmitButton, humanize } from "@/components/portal/ui";
import { InviteForm } from "@/components/portal/InviteForm";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";
import { revokeInvite, updateMember } from "@/server/members/actions";

export const metadata = { title: "Members & invitations" };

export default async function MembersPage() {
  const principal = await requireAccess("client.admin", undefined, "/portal/members");
  const supabase = await createClient();
  const org = principal.activeOrgId!;
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("memberships").select("user_id, client_role, status, created_at, profiles:user_id(display_name)").eq("org_id", org).order("created_at"),
    supabase.from("invitations").select("id, email_norm, client_role, expires_at, used_at, revoked_at, created_at").eq("org_id", org).order("created_at", { ascending: false }),
  ]);
  const inviteState = (i: { used_at: string | null; revoked_at: string | null; expires_at: string }) =>
    i.used_at ? "Accepted" : i.revoked_at ? "Revoked" : new Date(i.expires_at) < new Date() ? "Expired" : "Pending";
  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader eyebrow="Organisation administration" title="Members & invitations" />
      <p className="text-sm text-muted-foreground">You can invite people into this organisation and grant client roles only. Employee, moderator, publisher and portal-administrator roles can’t be granted here.</p>
      <Card><h2 className="mb-4 text-lg font-bold text-navy">Invite a member</h2><InviteForm /></Card>
      <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Members</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {(members ?? []).map((m) => {
            const self = m.user_id === principal.userId;
            const name = (m.profiles as unknown as { display_name: string | null } | null)?.display_name ?? "Member";
            return (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span><span className="font-semibold text-navy">{name}{self ? " (you)" : ""}</span><span className="block text-xs text-muted-foreground">{humanize(m.client_role)} · {m.status}</span></span>
                {!self && (
                  <form action={updateMember} className="flex flex-wrap gap-2">
                    <input type="hidden" name="user" value={m.user_id} />
                    <input type="hidden" name="role" value={m.client_role === "client_admin" ? "member" : "client_admin"} />
                    <input type="hidden" name="active" value={m.status === "active" ? "true" : "false"} />
                    <SubmitButton variant="outline">{m.client_role === "client_admin" ? "Make member" : "Make admin"}</SubmitButton>
                  </form>
                )}
                {!self && (
                  <form action={updateMember}>
                    <input type="hidden" name="user" value={m.user_id} /><input type="hidden" name="role" value={m.client_role} />
                    <input type="hidden" name="active" value={m.status === "active" ? "false" : "true"} />
                    <SubmitButton variant={m.status === "active" ? "danger" : "outline"}>{m.status === "active" ? "Revoke access" : "Restore access"}</SubmitButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Invitations</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {(invites ?? []).map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <span><span className="font-semibold text-navy">{i.email_norm}</span><span className="block text-xs text-muted-foreground">{humanize(i.client_role)} · expires {new Date(i.expires_at).toLocaleString()}</span></span>
              <span className="flex items-center gap-2">
                <StatusChip state={inviteState(i).toLowerCase()} /> <span className="sr-only">{inviteState(i)}</span>
                {inviteState(i) === "Pending" && <form action={revokeInvite}><input type="hidden" name="id" value={i.id} /><SubmitButton variant="danger">Revoke</SubmitButton></form>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
