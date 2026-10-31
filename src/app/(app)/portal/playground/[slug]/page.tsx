import { notFound, redirect } from "next/navigation";
import { PlaygroundRunner } from "@/components/portal/PlaygroundRunner";
import { PageHeader, SyntheticLabel } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { activeMembership, authorize, isEmployee } from "@/server/authz/policy";
import { getPrincipal } from "@/server/authz/principal";
import { scenarioFor } from "@/server/playground/scenarios";

export const metadata = { title: "Sandbox" };

export default async function SandboxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const principal = await getPrincipal();
  if (!principal) redirect(`/sign-in?next=/portal/playground/${slug}`);
  const scenario = scenarioFor(slug);
  if (!scenario) notFound();
  let entitled = false;
  if (activeMembership(principal)?.kind === "client") {
    const supabase = await createClient();
    const { data } = await supabase.from("entitlements").select("org_id, products!inner(slug)").eq("org_id", principal.activeOrgId!).eq("products.slug", slug);
    entitled = Boolean(data?.length);
  } else entitled = isEmployee(principal);
  // Knowing the URL is not enough: non-entitled users get a 404.
  if (!authorize(principal, "sandbox.run", { entitled }).allowed || (activeMembership(principal)?.kind === "client" && !entitled)) notFound();
  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader eyebrow={scenario.product} title={scenario.title}><SyntheticLabel /></PageHeader>
      <p className="max-w-3xl text-sm text-muted-foreground">{scenario.description} Outputs are simulated and are never an approved credit or business decision.</p>
      <PlaygroundRunner slug={scenario.slug} inputs={scenario.inputs} />
    </div>
  );
}
