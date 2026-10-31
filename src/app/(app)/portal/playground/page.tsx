import Link from "next/link";
import { Card, EmptyState, PageHeader, SyntheticLabel } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { getPrincipal } from "@/server/authz/principal";
import { activeMembership, authorize, isEmployee } from "@/server/authz/policy";
import { notFound, redirect } from "next/navigation";
import { SCENARIOS } from "@/server/playground/scenarios";

export const metadata = { title: "Playground" };

export default async function PlaygroundIndex() {
  const principal = await getPrincipal();
  if (!principal) redirect("/sign-in?next=/portal/playground");
  if (!authorize(principal, "employee.area").allowed && !authorize(principal, "client.area").allowed) notFound();
  let available = SCENARIOS;
  if (!isEmployee(principal) || activeMembership(principal)?.kind === "client") {
    const supabase = await createClient();
    const { data } = await supabase.from("entitlements").select("products(slug)").eq("org_id", principal.activeOrgId ?? "");
    const slugs = new Set((data ?? []).map((e) => (e.products as unknown as { slug: string } | null)?.slug));
    available = SCENARIOS.filter((s) => slugs.has(s.slug));
  }
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader eyebrow="Guided demonstrations" title={isEmployee(principal) ? "Playground" : "Product sandboxes"}><SyntheticLabel /></PageHeader>
      {!available.length ? <EmptyState title="No sandboxes are enabled for your organisation." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {available.map((s) => (
            <Link key={s.slug} href={`/portal/playground/${s.slug}`}>
              <Card className="h-full space-y-1 hover:border-green-ink">
                <p className="text-[11px] font-extrabold tracking-[2px] text-green-ink uppercase">{s.product}</p>
                <h2 className="text-lg font-bold text-navy">{s.title}</h2>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
