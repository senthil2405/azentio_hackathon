import { notFound } from "next/navigation";
import { IdeaForm } from "@/components/portal/InsightForms";
import { Card, Notice, PageHeader, Select, StatusChip, SubmitButton, Textarea, humanize } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";
import { authorize } from "@/server/authz/policy";
import { setIdeaStatus } from "@/server/insights/actions";

export const metadata = { title: "Improvement idea" };
const STATUSES = ["proposed", "under_review", "planned", "in_progress", "released", "not_proceeding"];

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const principal = await requireAccess("learning.read", undefined, `/portal/insights/ideas/${id}`);
  const supabase = await createClient();
  const { data: pub } = await supabase.from("idea_status_public").select("*").eq("id", id).maybeSingle();
  if (!pub) notFound();
  const canManage = authorize(principal, "ideas.manage").allowed;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader eyebrow={pub.offering} title={pub.title}><StatusChip state={pub.status} /></PageHeader>
      <Card className="space-y-2">
        <p className="text-sm"><strong>Owner:</strong> {pub.owner_team} · <strong>Last update:</strong> {new Date(pub.updated_at).toLocaleString()}</p>
        <p className="text-[15px]">{pub.public_update || "No public update yet."}</p>
        <p className="text-xs text-muted-foreground">Status reflects a decision stage, not a promised delivery date. No product model changes automatically from shared learning.</p>
      </Card>
      {canManage && <InternalPanel id={id} />}
    </div>
  );
}

async function InternalPanel({ id }: { id: string }) {
  const supabase = await createClient();
  const [{ data: idea }, { data: history }, { data: ev }, { data: linked }, { data: themes }] = await Promise.all([
    supabase.from("improvement_ideas").select("*").eq("id", id).single(),
    supabase.from("idea_status_changes").select("id, from_status, to_status, public_note, at").eq("idea_id", id).order("at"),
    supabase.from("shared_representations").select("id, title, period_coarse").eq("status", "published").limit(200),
    supabase.from("idea_evidence").select("shared_rep_id").eq("idea_id", id),
    supabase.from("themes").select("id, title"),
  ]);
  if (!idea) return null;
  return (
    <>
      <Notice tone="warning">Internal fields below (problem statement, priority, history) are visible to Azentio employees only.</Notice>
      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-navy">Change status</h2>
        <form action={setIdeaStatus} className="grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
          <input type="hidden" name="id" value={id} />
          <label className="text-sm font-semibold">Status<Select name="status" defaultValue={idea.status}>{STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select></label>
          <label className="text-sm font-semibold">Public update (shown to clients)<Textarea name="public_note" className="min-h-10" maxLength={1000} defaultValue={idea.public_update} /></label>
          <SubmitButton>Update</SubmitButton>
        </form>
        <ol className="space-y-1 border-t border-border pt-3 text-sm">
          {(history ?? []).map((h) => <li key={h.id}><span className="text-muted-foreground">{new Date(h.at).toLocaleString()}</span> · {h.from_status ? humanize(h.from_status) : "Created"} → <strong>{humanize(h.to_status)}</strong>{h.public_note ? ` — “${h.public_note}”` : ""}</li>)}
        </ol>
      </Card>
      <Card><h2 className="mb-4 text-lg font-bold text-navy">Edit idea</h2>
        <IdeaForm evidence={ev ?? []} themes={themes ?? []} initial={{ ...idea, evidence: (linked ?? []).map((l) => l.shared_rep_id) }} />
      </Card>
    </>
  );
}
