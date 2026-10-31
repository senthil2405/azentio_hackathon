import { AudienceBadge, Card, EmptyState, Input, PageHeader, Select, SubmitButton, humanize } from "@/components/portal/ui";
import { ReportButton } from "@/components/portal/ReportButton";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";
import { CONTRIBUTION_TYPES, OFFERINGS } from "@/server/learning/schema";

export const metadata = { title: "Shared learning" };

type Search = { q?: string; offering?: string; industry?: string; region?: string; period?: string; topic?: string };

export default async function LearningPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAccess("learning.read", undefined, "/portal/learning");
  const sp = await searchParams;
  const supabase = await createClient();
  // RLS restricts rows to published shared representations for community readers; the same query
  // drives both results and counts, so counts can never reveal hidden records.
  let query = supabase
    .from("shared_representations")
    .select("id, title, body, type, offering, industry, region_coarse, period_coarse, evidence_type, confidence, attribution_org_name, published_at", { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);
  if (sp.q?.trim()) query = query.textSearch("search", sp.q.trim().slice(0, 200), { type: "websearch", config: "english" });
  if (sp.offering) query = query.eq("offering", sp.offering);
  if (sp.industry) query = query.ilike("industry", sp.industry.slice(0, 80));
  if (sp.region) query = query.ilike("region_coarse", sp.region.slice(0, 80));
  if (sp.period) query = query.eq("period_coarse", sp.period.slice(0, 20));
  if (sp.topic && sp.topic in CONTRIBUTION_TYPES) query = query.eq("type", sp.topic);
  const { data, count } = await query;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader eyebrow="Collective learning" title="Shared learning">
        <AudienceBadge audience="community" />
      </PageHeader>
      <p className="text-sm text-muted-foreground">Moderator-reviewed, de-identified observations from participating organisations. Each item reflects one contributor’s view — popularity is not proof of market prevalence.</p>
      <Card>
        <form role="search" className="grid gap-3 md:grid-cols-6" aria-label="Filter shared learning">
          <label className="md:col-span-2"><span className="sr-only">Search</span><Input name="q" defaultValue={sp.q} placeholder="Search observations…" maxLength={200} /></label>
          <label><span className="sr-only">Offering</span><Select name="offering" defaultValue={sp.offering ?? ""}><option value="">All offerings</option>{OFFERINGS.map((o) => <option key={o}>{o}</option>)}</Select></label>
          <label><span className="sr-only">Topic</span><Select name="topic" defaultValue={sp.topic ?? ""}><option value="">All topics</option>{Object.entries(CONTRIBUTION_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></label>
          <label><span className="sr-only">Industry</span><Input name="industry" defaultValue={sp.industry} placeholder="Industry" maxLength={80} /></label>
          <label><span className="sr-only">Region</span><Input name="region" defaultValue={sp.region} placeholder="Region" maxLength={80} /></label>
          <label><span className="sr-only">Period</span><Input name="period" defaultValue={sp.period} placeholder="Period e.g. 2026-Q3" maxLength={20} /></label>
          <SubmitButton className="md:col-start-6">Apply</SubmitButton>
        </form>
      </Card>
      <p className="text-sm text-muted-foreground" aria-live="polite">{count ?? 0} result{count === 1 ? "" : "s"}</p>
      {!data?.length ? <EmptyState title="No shared observations match these filters." /> : (
        <ul className="space-y-4">
          {data.map((r) => (
            <li key={r.id}>
              <Card className="space-y-2">
                <p className="text-[11px] font-extrabold tracking-[2px] text-green-ink uppercase">{CONTRIBUTION_TYPES[r.type as keyof typeof CONTRIBUTION_TYPES]} · {r.offering}</p>
                <h2 className="text-lg font-bold text-navy">{r.title}</h2>
                <p className="text-[15px] leading-relaxed">{r.body}</p>
                <p className="text-xs text-muted-foreground">
                  {r.industry} · {r.region_coarse} · {r.period_coarse} · evidence: {humanize(r.evidence_type)} · confidence: {humanize(r.confidence)}
                  {r.attribution_org_name ? ` · shared by ${r.attribution_org_name}` : " · contributor not identified"}
                </p>
                <ReportButton id={r.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
