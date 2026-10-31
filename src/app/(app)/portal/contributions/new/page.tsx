import { ContributionForm } from "@/components/portal/ContributionForm";
import { PageHeader } from "@/components/portal/ui";
import { requireAccess } from "@/server/authz/guard";
import { createContribution } from "@/server/learning/actions";

export const metadata = { title: "New observation" };

export default async function NewContributionPage() {
  await requireAccess("learning.contribute", undefined, "/portal/contributions/new");
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Collective learning" title="Share a market observation" />
      <ContributionForm action={createContribution} mode="create" />
    </div>
  );
}
