import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/server/authz/policy";
import { getPrincipal } from "@/server/authz/principal";

const SIGNED_URL_TTL_SECONDS = 300; // approved: owner (plan.md §3)
const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });

/**
 * The only way to reach protected media (T3). Authorizes against the asset's audience, then issues a
 * short-lived signed URL. Unauthorized and nonexistent assets are indistinguishable (404).
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return notFound();
  const principal = await getPrincipal();
  const supabase = await createClient();
  const { data: asset } = await supabase.from("media_assets").select("id, audience, org_id, storage_path, external_url").eq("id", id).maybeSingle();
  if (!asset || !authorize(principal, "resource.read", { audience: asset.audience, orgId: asset.org_id }).allowed) return notFound();
  if (asset.external_url) return NextResponse.redirect(asset.external_url, { status: 302 });
  const { data, error } = await supabase.storage.from("media").createSignedUrl(asset.storage_path!, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "media_unavailable" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
