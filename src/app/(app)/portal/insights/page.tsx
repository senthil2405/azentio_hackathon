import Link from "next/link";
import { AudienceBadge, Card, EmptyState, PageHeader, StatusChip } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";
import { authorize } from "@/server/authz/policy";

export const metadata = { title: "Themes & ideas" };

type Stats = { evidence_count: number | null; distinct_orgs: number | null; suppressed: boolean; min_cohort: number };

export default async function InsightsPage() {
  const principal = await requireAccess("learning.read", undefined, "/portal/insights");
  const supabase = await createClient();
  const [{ data: themes }, { data: ideas }] = await Promise.all([
    supabase.from("themes").select("id, title, summary, limitations, offering, updated_at").order("updated_at", { ascending: false }),
    supabase.from("idea_status_public").select("id, title, offering, owner_team, status, public_update, updated_at").order("updated_at", { ascending: false }),
  ]);
  const stats = new Map<string, Stats>();
  await Promise.all((themes ?? []).map(async (t) => {
    const { data } = await supabase.rpc("theme_stats", { p_theme: t.id });
    if (data?.[0]) stats.set(t.id, data[0] as Stats);
  }));
  const canTheme = authorize(principal, "themes.manage").allowed;
  const canIdea = authorize(principal, "ideas.manage").allowed;

  return (
    <div className="max-w-5xl space-y-10">
      <PageHeader eyebrow="Insights & improvement loop" title="Themes & ideas"><AudienceBadge audience="community" /></PageHeader>
      <section className="space-y-4" aria-labelledby="themes">
        <div className="flex items-center justify-between">
          <h2 id="themes" className="text-lg font-bold text-navy">Themes</h2>
          {canTheme && <Link href="/portal/insights/themes/new" className="rounded-[5px] bg-green px-3 py-2 text-sm font-bold text-[#122015]">New theme</Link>}
        </div>
        {!themes?.length ? <EmptyState title="No themes yet." /> : (
          <div className="grid gap-4 md:grid-cols-2">
            {themes.map((t) => {
              const s = stats.get(t.id);
              return (
                <Link key={t.id} href={`/portal/insights/themes/${t.id}`}>
                  <Card className="h-full space-y-2 hover:border-green-ink">
                    {t.offering && <p className="text-[11px] font-extrabold tracking-[2px] text-green-ink uppercase">{t.offering}</p>}
                    <h3 className="text-lg font-bold text-navy">{t.title}</h3>
                    <p className="line-clamp-3 text-sm">{t.summary}</p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {s && !s.suppressed ? `${s.evidence_count} contributions from ${s.distinct_orgs} organisations` : `Counts hidden: fewer than ${s?.min_cohort ?? 3} organisations contributed`}
                      {" · updated "}{new Date(t.updated_at).toLocaleDateString()}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      <section className="space-y-4" aria-labelledby="ideas">
        <div className="flex items-center justify-between">
          <h2 id="ideas" className="text-lg font-bold text-navy">Improvement ideas</h2>
          {canIdea && <Link href="/portal/insights/ideas/new" className="rounded-[5px] bg-green px-3 py-2 text-sm font-bold text-[#122015]">New idea</Link>}
        </div>
        <p className="text-sm text-muted-foreground">Statuses describe decisions, not delivery commitments.</p>
        {!ideas?.length ? <EmptyState title="No improvement ideas yet." /> : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-white">
            {ideas.map((i) => (
              <li key={i.id}>
                <Link href={`/portal/insights/ideas/${i.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/60">
                  <span><span className="block font-semibold text-navy">{i.title}</span><span className="text-xs text-muted-foreground">{i.offering} · {i.owner_team} · updated {new Date(i.updated_at).toLocaleDateString()}</span></span>
                  <StatusChip state={i.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
