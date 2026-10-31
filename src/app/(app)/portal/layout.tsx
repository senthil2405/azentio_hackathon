import { redirect } from "next/navigation";
import { Sidebar } from "@/components/portal/Sidebar";
import { EmptyState } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/server/authz/policy";
import { getPrincipal } from "@/server/authz/principal";
import { switchWorkspace } from "@/server/portal/workspace-actions";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const principal = await getPrincipal();
  if (!principal) redirect("/sign-in?next=/portal");
  const supabase = await createClient();

  if (!authorize(principal, "portal.enter").allowed) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24">
        <EmptyState title="No workspace yet">
          Your account ({principal.email}) isn’t linked to an organisation. Clients join through an invitation from their administrator; employees are provisioned by a portal administrator.
        </EmptyState>
      </main>
    );
  }
  const { data: profile } = await supabase.from("profiles").select("terms_accepted_at").eq("user_id", principal.userId).maybeSingle();
  if (!profile?.terms_accepted_at) redirect("/onboarding");

  // The workspace is bound at sign-in. If it is missing (e.g. membership revoked), ask instead of guessing.
  if (!principal.activeOrgId) {
    return (
      <main className="mx-auto max-w-lg space-y-4 px-4 py-24">
        <EmptyState title="Choose a workspace">Select the organisation you want to work in.</EmptyState>
        <form action={switchWorkspace} className="flex gap-2">
          <label htmlFor="org" className="sr-only">Workspace</label>
          <select id="org" name="org" className="flex-1 rounded-md border border-input bg-white px-3 py-2">
            {principal.memberships.map((m) => <option key={m.orgId} value={m.orgId}>{m.orgName}</option>)}
          </select>
          <button className="rounded-[5px] bg-green px-4 py-2 text-sm font-bold text-[#122015]">Continue</button>
        </form>
      </main>
    );
  }
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar principal={principal} unread={count ?? 0} />
      <main id="main-content" className="min-w-0 flex-1 px-5 py-8 md:px-10">
        {children}
      </main>
    </div>
  );
}
