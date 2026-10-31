import { notFound } from "next/navigation";
import { ModerationForm } from "@/components/portal/ModerationForm";
import { Card, PageHeader, StatusChip, humanize } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";

export const metadata = { title: "Review contribution" };

const quarter = (d: string) => `${d.slice(0, 4)}-Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1}`;

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAccess("moderation", undefined, `/portal/moderation/${id}`);
  const supabase = await createClient();
  const { data: c } = await supabase.from("contributions").select("id, state, current_version_id").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: v }, { data: consents }, { data: notes }] = await Promise.all([
    supabase.from("contribution_versions").select("*").eq("id", c.current_version_id).single(),
    supabase.from("consents").select("kind, granted, at").eq("contribution_id", id).order("at", { ascending: false }),
    supabase.rpc("moderation_private_notes", { p_contribution: id }),
  ]);
  const consent = (k: string) => consents?.find((x) => x.kind === k)?.granted ?? false;
  const flags = (v!.sensitive_flags as string[]) ?? [];
  return (
    <div className="grid max-w-6xl gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <PageHeader eyebrow="Submitted source (private)" title={v!.title}><StatusChip state={c.state} /></PageHeader>
        {flags.length > 0 && <p className="rounded-md border border-warning/40 bg-[#fff8ef] px-4 py-3 text-sm font-semibold text-warning">Sensitive-content check flagged: {flags.map(humanize).join(", ")}. Heuristic only — read carefully.</p>}
        <Card className="space-y-3 text-sm">
          <p><strong>Offering:</strong> {v!.offering} · <strong>Industry:</strong> {v!.industry} · <strong>Region:</strong> {v!.region}</p>
          <p><strong>Period:</strong> {v!.period_start} → {v!.period_end} · <strong>Evidence:</strong> {humanize(v!.evidence_type)} · <strong>Confidence:</strong> {humanize(v!.confidence)}</p>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{v!.body}</p>
          <p className="text-xs text-muted-foreground">Consents — publish: {consent("publish_shared") ? "yes" : "no"} · attribution: {consent("attribution") ? "yes" : "no"} · training: {consent("training") ? "yes" : "no"}</p>
        </Card>
        {!!notes?.length && (
          <Card>
            <h2 className="mb-2 text-sm font-bold text-navy">Reviewer history (private)</h2>
            <ul className="space-y-1 text-sm">{notes.filter((n: { reviewer_note_private: string | null }) => n.reviewer_note_private).map((n: { id: number; at: string; to_state: string; reviewer_note_private: string }) => (
              <li key={n.id}><span className="text-muted-foreground">{new Date(n.at).toLocaleDateString()} · {humanize(n.to_state)}:</span> {n.reviewer_note_private}</li>
            ))}</ul>
          </Card>
        )}
      </div>
      <div>
        <ModerationForm id={id} state={c.state} title={v!.title} body={v!.body} regionSuggestion="" periodSuggestion={quarter(v!.period_start)} attributionConsent={consent("attribution")} />
      </div>
    </div>
  );
}
