import { ThemeForm } from "@/components/portal/InsightForms";
import { Card, PageHeader } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";

export const metadata = { title: "New theme" };

export default async function NewThemePage() {
  await requireAccess("themes.manage", undefined, "/portal/insights/themes/new");
  const supabase = await createClient();
  const { data } = await supabase.from("shared_representations").select("id, title, period_coarse").eq("status", "published").order("published_at", { ascending: false }).limit(200);
  return (
    <div className="max-w-3xl"><PageHeader eyebrow="Insights" title="New theme" /><Card><ThemeForm evidence={data ?? []} /></Card></div>
  );
}
