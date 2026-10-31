import { notFound } from "next/navigation";
import { ContributionForm } from "@/components/portal/ContributionForm";
import { PageHeader } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";
import { editContribution } from "@/server/learning/actions";
import type { ContributionFields } from "@/server/learning/schema";

export const metadata = { title: "Edit observation" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const principal = await requireAccess("learning.contribute", undefined, `/portal/contributions/${id}/edit`);
  const supabase = await createClient();
  const { data: c } = await supabase.from("contributions").select("author_id, state, current_version_id").eq("id", id).maybeSingle();
  if (!c || c.author_id !== principal.userId || !["draft", "returned", "org_shared", "published"].includes(c.state)) notFound();
  const { data: v } = await supabase.from("contribution_versions").select("*").eq("id", c.current_version_id).single();
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Collective learning" title="Edit observation" />
      <ContributionForm action={editContribution} mode={c.state === "published" ? "revise" : "edit"} initial={{ ...(v as ContributionFields), id }} />
    </div>
  );
}
