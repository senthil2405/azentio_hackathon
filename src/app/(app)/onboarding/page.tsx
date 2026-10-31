import { redirect } from "next/navigation";
import { Card, SubmitButton } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { getPrincipal } from "@/server/authz/principal";

export const metadata = { title: "Workspace terms" };

async function accept() {
  "use server";
  const supabase = await createClient();
  await supabase.rpc("accept_terms");
  redirect("/portal");
}

export default async function OnboardingPage() {
  const principal = await getPrincipal();
  if (!principal) redirect("/sign-in?next=/onboarding");
  const org = principal.memberships.find((m) => m.orgId === principal.activeOrgId);
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <Card className="w-full max-w-2xl space-y-5">
        <p className="text-[11px] font-extrabold tracking-[2.2px] text-green-ink uppercase">Welcome{org ? ` · ${org.orgName}` : ""}</p>
        <h1 className="text-2xl font-bold text-navy">Before you enter the workspace</h1>
        <div className="space-y-3 text-[15px] leading-relaxed text-foreground">
          <p><strong>Joining is not consent to share.</strong> Being a member of this workspace does not allow azentio.ai to share, publish or train on anything you contribute.</p>
          <p><strong>Everything starts private.</strong> Observations you write are private drafts. You choose, per contribution, whether to keep it private, share it within your organisation, or propose it to the shared learning community.</p>
          <p><strong>Community sharing is reviewed.</strong> Proposed contributions are reviewed by an Azentio moderator, who removes identifying details before publication. Organisation attribution is opt-in.</p>
          <p><strong>You can withdraw.</strong> Withdrawing removes a shared contribution from search, themes and AIRA immediately. Material that others have already viewed cannot be recalled.</p>
          <p><strong>Training is separate.</strong> Any model-training or federated-learning programme asks for its own, separate consent.</p>
          <p className="text-sm text-muted-foreground">All data in this hackathon environment is synthetic.</p>
        </div>
        <form action={accept}>
          <SubmitButton>I understand — enter the workspace</SubmitButton>
        </form>
      </Card>
    </main>
  );
}
