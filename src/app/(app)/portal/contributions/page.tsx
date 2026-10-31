import Link from "next/link";
import { AudienceBadge, EmptyState, PageHeader, StatusChip } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";

export const metadata = { title: "Observations" };

type Row = { id: string; state: string; visibility: string; updated_at: string; author_id: string; contribution_versions: { title: string; offering: string } | null };

function List({ rows, empty }: { rows: Row[]; empty: string }) {
  if (!rows.length) return <EmptyState title={empty} />;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-white">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/portal/contributions/${r.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/60">
            <span>
              <span className="block font-semibold text-navy">{r.contribution_versions?.title}</span>
              <span className="text-xs text-muted-foreground">{r.contribution_versions?.offering} · updated {new Date(r.updated_at).toLocaleDateString()}</span>
            </span>
            <span className="flex flex-wrap gap-2"><AudienceBadge audience={r.visibility} /><StatusChip state={r.state} /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ContributionsPage() {
  const principal = await requireAccess("learning.contribute", undefined, "/portal/contributions");
  const supabase = await createClient();
  const { data } = await supabase
    .from("contributions")
    .select("id, state, visibility, updated_at, author_id, contribution_versions!contributions_current_version_fk(title, offering)")
    .order("updated_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  const mine = rows.filter((r) => r.author_id === principal.userId);
  const org = rows.filter((r) => r.author_id !== principal.userId && r.visibility === "org");
  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader eyebrow="Collective learning" title="Observations">
        <Link href="/portal/contributions/new" className="rounded-[5px] bg-green px-4 py-2.5 text-sm font-bold text-[#122015]">New observation</Link>
      </PageHeader>
      <section aria-labelledby="mine" className="space-y-3">
        <h2 id="mine" className="text-lg font-bold text-navy">My observations</h2>
        <List rows={mine} empty="You haven’t written any observations yet." />
      </section>
      <section aria-labelledby="org" className="space-y-3">
        <h2 id="org" className="text-lg font-bold text-navy">Our organisation’s observations</h2>
        <p className="text-sm text-muted-foreground">Private to your organisation. This is separate from the cross-client shared learning feed.</p>
        <List rows={org} empty="Nothing has been shared within your organisation yet." />
      </section>
    </div>
  );
}
