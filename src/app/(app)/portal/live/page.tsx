import { AudienceBadge, Card, EmptyState, PageHeader } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";
import { authorize } from "@/server/authz/policy";

export const metadata = { title: "Live & recordings" };

export default async function LivePage() {
  const principal = await requireAccess("employee.area", undefined, "/portal/live");
  const supabase = await createClient();
  const { data } = await supabase.from("broadcasts").select("id, title, description, audience, starts_at, media_id").order("starts_at");
  const canPublish = authorize(principal, "broadcasts.manage").allowed;
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader eyebrow="azentio.ai LIVE" title="Internal sessions & recordings"><AudienceBadge audience="employees" /></PageHeader>
      <p className="text-sm text-muted-foreground">{canPublish ? "You hold the publisher grant and can configure sessions." : "Only employees with the publisher grant can configure sessions or homepage content."}</p>
      {!data?.length ? <EmptyState title="No sessions scheduled." /> : (
        <ul className="space-y-3">{data.map((b) => (
          <li key={b.id}><Card className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-navy">{b.title}</h2><AudienceBadge audience={b.audience} /></div>
            <p className="text-sm">{b.description}</p>
            <p className="text-xs text-muted-foreground">{new Date(b.starts_at).toLocaleString()}</p>
            {b.media_id && <a href={`/api/media/${b.media_id}`} className="text-sm font-semibold text-green-ink underline">Open recording</a>}
          </Card></li>
        ))}</ul>
      )}
    </div>
  );
}
