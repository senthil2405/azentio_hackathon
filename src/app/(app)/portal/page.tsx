import Link from "next/link";
import { AudienceBadge, Card, EmptyState, PageHeader, StatusChip } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";
import { activeMembership, authorize, isEmployee, type Principal } from "@/server/authz/policy";

export const metadata = { title: "Dashboard" };

function Tile({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href}>
      <Card className="h-full hover:border-green-ink"><h3 className="font-bold text-navy">{title} ↗</h3><p className="mt-1 text-sm text-muted-foreground">{body}</p></Card>
    </Link>
  );
}

export default async function Dashboard() {
  const principal = await requireAccess("portal.enter");
  return isEmployee(principal) && activeMembership(principal)?.kind !== "client" ? <EmployeeDashboard principal={principal} /> : <ClientDashboard principal={principal} />;
}

async function EmployeeDashboard({ principal }: { principal: Principal }) {
  const supabase = await createClient();
  const can = (a: Parameters<typeof authorize>[1]) => authorize(principal, a).allowed;
  const [{ data: content }, { data: broadcasts }, { count: queue }] = await Promise.all([
    supabase.from("content_items").select("id, kind, title, audience, review_date").in("audience", ["employees", "community"]).order("created_at", { ascending: false }).limit(6),
    supabase.from("broadcasts").select("id, title, starts_at, audience").order("starts_at").limit(3),
    can("moderation") ? supabase.from("contributions").select("id", { count: "exact", head: true }).eq("state", "submitted") : Promise.resolve({ count: null }),
  ]);
  return (
    <div className="max-w-6xl space-y-8">
      <PageHeader eyebrow="Employee portal" title="Welcome back"><AudienceBadge audience="employees" /></PageHeader>
      <div className="grid gap-4 md:grid-cols-3">
        <Tile href="/portal/playground" title="Playground" body="Guided product scenarios with synthetic data." />
        <Tile href="/portal/live" title="Live & recordings" body="Internal broadcasts for employees." />
        <Tile href="/portal/insights" title="Themes & ideas" body="Approved cross-client learning and improvement status." />
        {can("moderation") && <Tile href="/portal/moderation" title={`Moderation (${queue ?? 0} waiting)`} body="Review proposed contributions." />}
        {can("ideas.manage") && <Tile href="/portal/insights/ideas/new" title="New improvement idea" body="Link approved evidence to an idea." />}
        <Tile href="/portal/learning" title="Shared learning" body="Search approved, de-identified observations." />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Internal knowledge, experiments & release notes</h2>
          {!content?.length ? <EmptyState title="Nothing yet." /> : (
            <ul className="space-y-2">{content.map((c) => (
              <li key={c.id}><Card className="space-y-1 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-navy">{c.title}</span><AudienceBadge audience={c.audience} /></div>
                <p className="text-xs text-muted-foreground">{c.kind.replace("_", " ")}{c.review_date ? ` · review by ${c.review_date}` : ""}</p></Card></li>
            ))}</ul>
          )}
        </section>
        <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Upcoming internal sessions</h2>
          {!broadcasts?.length ? <EmptyState title="No sessions scheduled." /> : (
            <ul className="space-y-2">{broadcasts.map((b) => <li key={b.id}><Card className="p-4"><p className="font-semibold text-navy">{b.title}</p><p className="text-xs text-muted-foreground">{new Date(b.starts_at).toLocaleString()}</p></Card></li>)}</ul>
          )}
        </section>
      </div>
    </div>
  );
}

async function ClientDashboard({ principal }: { principal: Principal }) {
  const supabase = await createClient();
  const org = activeMembership(principal);
  const [{ data: ents }, { data: mine }, { data: content }, { data: ideas }] = await Promise.all([
    supabase.from("entitlements").select("products(slug, name)").eq("org_id", org?.orgId ?? ""),
    supabase.from("contributions").select("id, state, contribution_versions!contributions_current_version_fk(title)").eq("author_id", principal.userId).order("updated_at", { ascending: false }).limit(5),
    supabase.from("content_items").select("id, title, kind, audience").in("audience", ["org", "community"]).order("created_at", { ascending: false }).limit(5),
    supabase.from("idea_status_public").select("id, title, status, updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);
  type P = { slug: string; name: string };
  const products = (ents ?? []).map((e) => e.products as unknown as P).filter(Boolean);
  return (
    <div className="max-w-6xl space-y-8">
      <PageHeader eyebrow="Client workspace" title={org?.orgName ?? "Workspace"}><AudienceBadge audience="org" /></PageHeader>
      <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Your entitled offerings</h2>
        {!products.length ? <EmptyState title="No offerings are enabled for your organisation yet.">Contact your Azentio account team.</EmptyState> : (
          <div className="grid gap-4 md:grid-cols-3">{products.map((p) => <Tile key={p.slug} href={`/portal/playground/${p.slug}`} title={p.name} body="Open the guided sandbox (synthetic data)." />)}</div>
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3"><h2 className="text-lg font-bold text-navy">My contributions</h2>
          {!mine?.length ? <EmptyState title="No contributions yet."><Link className="text-green-ink underline" href="/portal/contributions/new">Share an observation</Link></EmptyState> : (
            <ul className="space-y-2">{mine.map((c) => <li key={c.id}><Link href={`/portal/contributions/${c.id}`}><Card className="flex items-center justify-between gap-2 p-4"><span className="text-sm font-semibold text-navy">{(c.contribution_versions as unknown as { title: string } | null)?.title}</span><StatusChip state={c.state} /></Card></Link></li>)}</ul>
          )}
        </section>
        <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Briefings & release notes</h2>
          {!content?.length ? <EmptyState title="Nothing published for you yet." /> : (
            <ul className="space-y-2">{content.map((c) => <li key={c.id}><Card className="space-y-1 p-4"><p className="text-sm font-semibold text-navy">{c.title}</p><AudienceBadge audience={c.audience} /></Card></li>)}</ul>
          )}
        </section>
        <section className="space-y-3"><h2 className="text-lg font-bold text-navy">Improvement status</h2>
          {!ideas?.length ? <EmptyState title="No improvement ideas shared yet." /> : (
            <ul className="space-y-2">{ideas.map((i) => <li key={i.id}><Link href={`/portal/insights/ideas/${i.id}`}><Card className="flex items-center justify-between gap-2 p-4"><span className="text-sm font-semibold text-navy">{i.title}</span><StatusChip state={i.status} /></Card></Link></li>)}</ul>
          )}
        </section>
      </div>
    </div>
  );
}
