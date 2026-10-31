import { notFound } from "next/navigation";
import { ThemeForm } from "@/components/portal/InsightForms";
import { Card, Notice, PageHeader, humanize } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";
import { authorize } from "@/server/authz/policy";

export const metadata = { title: "Theme" };

export default async function ThemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const principal = await requireAccess("learning.read", undefined, `/portal/insights/themes/${id}`);
  const supabase = await createClient();
  const { data: t } = await supabase.from("themes").select("*").eq("id", id).maybeSingle();
  if (!t) notFound();
  const [{ data: ev }, { data: stats }, { data: ideas }] = await Promise.all([
    supabase.from("theme_evidence").select("shared_representations(id, title, body, period_coarse, region_coarse, confidence, evidence_type)").eq("theme_id", id),
    supabase.rpc("theme_stats", { p_theme: id }),
    supabase.from("idea_status_public").select("id, title, status").eq("theme_id", id),
  ]);
  type Rep = { id: string; title: string; body: string; period_coarse: string; region_coarse: string; confidence: string; evidence_type: string };
  const reps = (ev ?? []).map((e) => e.shared_representations as unknown as Rep).filter(Boolean);
  const s = stats?.[0];
  const canManage = authorize(principal, "themes.manage").allowed;
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader eyebrow={t.offering ?? "Theme"} title={t.title} />
      {s?.suppressed ? (
        <Notice tone="warning">Fewer than {s.min_cohort} organisations contributed to this theme, so counts are hidden. Treat it as anecdotal.</Notice>
      ) : (
        <Notice>{s?.evidence_count} supporting contributions from {s?.distinct_orgs} distinct organisations. Repeated posts from one organisation count once. This is not a measure of market prevalence.</Notice>
      )}
      <Card className="space-y-3">
        <p className="text-[15px] leading-relaxed">{t.summary || "No summary yet."}</p>
        {t.limitations && <p className="text-sm"><strong>Confidence & limitations:</strong> {t.limitations}</p>}
        <p className="text-xs text-muted-foreground">Last updated {new Date(t.updated_at).toLocaleString()}</p>
      </Card>
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy">Supporting evidence</h2>
        {reps.map((r) => (
          <Card key={r.id} className="space-y-1">
            <h3 className="font-semibold text-navy">{r.title}</h3>
            <p className="text-sm">{r.body}</p>
            <p className="text-xs text-muted-foreground">{r.region_coarse} · {r.period_coarse} · {humanize(r.evidence_type)} · confidence {r.confidence}</p>
          </Card>
        ))}
      </section>
      {!!ideas?.length && (
        <section><h2 className="mb-2 text-lg font-bold text-navy">Linked improvement ideas</h2>
          <ul className="list-disc pl-5 text-sm">{ideas.map((i) => <li key={i.id}><a className="text-green-ink underline" href={`/portal/insights/ideas/${i.id}`}>{i.title}</a> — {humanize(i.status)}</li>)}</ul>
        </section>
      )}
      {canManage && (
        <Card><h2 className="mb-4 text-lg font-bold text-navy">Edit theme</h2>
          <ThemeEditor id={id} theme={t} selected={reps.map((r) => r.id)} />
        </Card>
      )}
    </div>
  );
}

async function ThemeEditor({ id, theme, selected }: { id: string; theme: { title: string; summary: string; limitations: string; offering: string | null }; selected: string[] }) {
  const supabase = await createClient();
  const { data } = await supabase.from("shared_representations").select("id, title, period_coarse").eq("status", "published").order("published_at", { ascending: false }).limit(200);
  return <ThemeForm evidence={data ?? []} initial={{ id, ...theme, evidence: selected }} />;
}
