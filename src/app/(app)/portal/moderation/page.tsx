import Link from "next/link";
import { EmptyState, PageHeader, StatusChip, SubmitButton, humanize } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";
import { resolveReport } from "@/server/learning/actions";

export const metadata = { title: "Moderation" };

export default async function ModerationPage() {
  await requireAccess("moderation", undefined, "/portal/moderation");
  const supabase = await createClient();
  const [{ data: queue }, { data: reports }] = await Promise.all([
    supabase
      .from("contributions")
      .select("id, state, updated_at, published_version_id, current_version_id, contribution_versions!contributions_current_version_fk(title, offering, sensitive_flags)")
      .in("state", ["submitted", "under_review", "published"])
      .order("updated_at"),
    supabase.from("reports").select("id, reason, created_at, shared_rep_id, shared_representations(title)").eq("state", "open").order("created_at"),
  ]);
  type Q = { id: string; state: string; updated_at: string; published_version_id: string | null; current_version_id: string; contribution_versions: { title: string; offering: string; sensitive_flags: string[] } | null };
  const items = ((queue ?? []) as unknown as Q[]).filter((q) => q.state !== "published" || q.published_version_id !== q.current_version_id);
  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader eyebrow="Learning moderation" title="Review queue" />
      <p className="text-sm text-muted-foreground">You only see contributions proposed to the learning community. Private drafts and organisation-only items never appear here.</p>
      {items.length === 0 ? <EmptyState title="Nothing waiting for review." /> : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {items.map((q) => (
            <li key={q.id}>
              <Link href={`/portal/moderation/${q.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/60">
                <span>
                  <span className="block font-semibold text-navy">{q.contribution_versions?.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {q.contribution_versions?.offering}
                    {q.state === "published" ? " · revision of a published item" : ""}
                    {(q.contribution_versions?.sensitive_flags?.length ?? 0) > 0 && <strong className="text-warning"> · flagged: {q.contribution_versions!.sensitive_flags.map(humanize).join(", ")}</strong>}
                  </span>
                </span>
                <StatusChip state={q.state} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section className="space-y-3" aria-labelledby="reports">
        <h2 id="reports" className="text-lg font-bold text-navy">Open reports</h2>
        {!reports?.length ? <EmptyState title="No open reports." /> : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-white p-4 text-sm">
                <p className="font-semibold text-navy">{(r.shared_representations as unknown as { title: string } | null)?.title ?? "(already removed)"}</p>
                <p className="my-1 text-muted-foreground">“{r.reason}”</p>
                <form action={resolveReport} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input name="note" placeholder="Decision note (shared with contributor)" className="min-w-64 flex-1 rounded border border-input px-2 py-1.5" />
                  <SubmitButton name="uphold" value="true" variant="outline">Uphold</SubmitButton>
                  <SubmitButton name="uphold" value="false" variant="outline">Dismiss</SubmitButton>
                </form>
                <p className="mt-2 text-xs text-muted-foreground">To hide the item while you investigate, open it from the queue and choose “Temporarily unpublish”.</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
