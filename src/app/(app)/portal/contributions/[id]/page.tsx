import Link from "next/link";
import { notFound } from "next/navigation";
import { AudienceBadge, Card, PageHeader, StatusChip, SubmitButton, humanize } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";
import { authorAction } from "@/server/learning/actions";
import { CONTRIBUTION_TYPES, EVIDENCE_TYPES } from "@/server/learning/schema";

export const metadata = { title: "Observation" };

const WHO_CAN_SEE: Record<string, string> = {
  draft: "Only you. Not your organisation, not moderators.",
  org_shared: "Members of your organisation’s workspace. Never other organisations or moderators.",
  submitted: "You and Azentio learning moderators (for review). Not other organisations yet.",
  returned: "You and Azentio learning moderators. Amend and resubmit, or withdraw.",
  rejected: "You and Azentio learning moderators. It was not published.",
  published: "A moderator-reviewed, de-identified version is visible to the learning community (client members and Azentio employees). Your original text, name and organisation are not shown unless you opted into attribution.",
  under_review: "The shared version is temporarily hidden while a moderator reviews a report.",
  removed: "Removed from the learning community by a moderator.",
  withdrawn: "Withdrawn. Removed from search, themes and AIRA. People who viewed it earlier may still remember or have copied it; that cannot be recalled.",
};

export default async function ContributionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const principal = await requireAccess("portal.enter", undefined, `/portal/contributions/${id}`);
  const supabase = await createClient();
  const { data: c } = await supabase.from("contributions").select("id, author_id, state, visibility, current_version_id, published_version_id, created_at").eq("id", id).maybeSingle();
  if (!c) notFound(); // RLS: invisible == nonexistent
  const isAuthor = c.author_id === principal.userId;
  const [{ data: v }, { data: events }, { data: consents }] = await Promise.all([
    supabase.from("contribution_versions").select("*").eq("id", c.current_version_id).single(),
    supabase.from("moderation_events").select("id, from_state, to_state, public_reason, at").eq("contribution_id", id).order("at"),
    supabase.from("consents").select("kind, granted, at").eq("contribution_id", id).order("at", { ascending: false }),
  ]);
  const latestConsent = (k: string) => consents?.find((x) => x.kind === k)?.granted ?? false;
  const flags = (v?.sensitive_flags as string[] | null) ?? [];

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader eyebrow={CONTRIBUTION_TYPES[v!.type as keyof typeof CONTRIBUTION_TYPES]} title={v!.title}>
        <div className="flex flex-wrap gap-2"><AudienceBadge audience={c.visibility} /><StatusChip state={c.state} /></div>
      </PageHeader>

      <Card className="space-y-2">
        <h2 className="text-sm font-bold text-navy">Who can see this, and how it may be used</h2>
        <p className="text-sm text-foreground">{WHO_CAN_SEE[c.state]}</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-xs text-muted-foreground">
          <li>Store & process: {latestConsent("store_process") ? "yes" : "no"}</li>
          <li>Publish reviewed version: {latestConsent("publish_shared") ? "yes" : "no"}</li>
          <li>Attribution: {latestConsent("attribution") ? "yes" : "no"}</li>
          <li>Future training: {latestConsent("training") ? "yes" : "no"}</li>
        </ul>
      </Card>

      <Card className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-muted-foreground">Offering</dt><dd className="font-semibold">{v!.offering}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Industry / region</dt><dd className="font-semibold">{v!.industry} · {v!.region}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Period</dt><dd className="font-semibold">{v!.period_start} → {v!.period_end}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Evidence</dt><dd className="font-semibold">{EVIDENCE_TYPES[v!.evidence_type as keyof typeof EVIDENCE_TYPES]}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Confidence</dt><dd className="font-semibold">{humanize(v!.confidence)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Version</dt><dd className="font-semibold">v{v!.n}{c.published_version_id && c.published_version_id !== c.current_version_id ? " (revision pending review)" : ""}</dd></div>
        </dl>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{v!.body}</p>
        {v!.links?.length > 0 && (
          <ul className="list-disc pl-5 text-sm">
            {v!.links.map((l: string) => <li key={l}><a href={l} rel="noopener noreferrer nofollow" target="_blank" className="text-green-ink underline">{l}</a></li>)}
          </ul>
        )}
        {isAuthor && flags.length > 0 && (
          <p className="text-xs font-semibold text-warning">Automatic check flagged: {flags.map(humanize).join(", ")}. A moderator will review before any sharing.</p>
        )}
      </Card>

      {isAuthor && (
        <Card className="space-y-4">
          <h2 className="text-sm font-bold text-navy">Actions</h2>
          <div className="flex flex-wrap items-start gap-3">
            {["draft", "returned", "org_shared"].includes(c.state) && (
              <Link href={`/portal/contributions/${id}/edit`} className="rounded-[5px] border border-border px-4 py-2 text-sm font-bold text-navy">Edit</Link>
            )}
            {c.state === "published" && (
              <Link href={`/portal/contributions/${id}/edit`} className="rounded-[5px] border border-border px-4 py-2 text-sm font-bold text-navy">Revise (re-review)</Link>
            )}
            {c.state === "draft" && (
              <form action={authorAction}>
                <input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="share_org" />
                <SubmitButton variant="outline">Share with my organisation</SubmitButton>
              </form>
            )}
            {["draft", "org_shared", "returned"].includes(c.state) && (
              <form action={authorAction} className="space-y-2 rounded-md border border-border p-3">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="action" value={c.state === "returned" ? "resubmit" : "submit"} />
                <label className="flex max-w-sm gap-2 text-xs">
                  <input type="checkbox" name="consent_publish" required defaultChecked={latestConsent("publish_shared")} className="accent-green-ink" />
                  I permit publishing a moderator-reviewed, de-identified version to the learning community.
                </label>
                <SubmitButton>{c.state === "returned" ? "Resubmit for review" : "Propose to learning community"}</SubmitButton>
              </form>
            )}
            {["org_shared", "submitted", "returned", "published", "under_review"].includes(c.state) && (
              <form action={authorAction}>
                <input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="withdraw" />
                <SubmitButton variant="danger">Withdraw</SubmitButton>
              </form>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Withdrawing removes the shared version from search, themes and AIRA immediately. Copies others already made cannot be recalled.</p>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-bold text-navy">History</h2>
        <ol className="space-y-2 text-sm">
          {(events ?? []).map((e) => (
            <li key={e.id} className="flex flex-wrap gap-2">
              <span className="text-muted-foreground">{new Date(e.at).toLocaleString()}</span>
              <span>{e.from_state ? humanize(e.from_state) : "Created"} → <strong>{humanize(e.to_state)}</strong></span>
              {e.public_reason && <span className="text-muted-foreground">“{e.public_reason}”</span>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
