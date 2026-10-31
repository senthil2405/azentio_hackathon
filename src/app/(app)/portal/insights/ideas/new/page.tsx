import { IdeaForm } from "@/components/portal/InsightForms";
import { Card, PageHeader } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";

export const metadata = { title: "New improvement idea" };

export default async function NewIdeaPage() {
  await requireAccess("ideas.manage", undefined, "/portal/insights/ideas/new");
  const supabase = await createClient();
  const [{ data: ev }, { data: themes }] = await Promise.all([
    supabase.from("shared_representations").select("id, title, period_coarse").eq("status", "published").limit(200),
    supabase.from("themes").select("id, title"),
  ]);
  return <div className="max-w-3xl"><PageHeader eyebrow="Improvement loop" title="New improvement idea" /><Card><IdeaForm evidence={ev ?? []} themes={themes ?? []} /></Card></div>;
}
