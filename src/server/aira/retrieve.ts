import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Citation = { id: string; kind: "shared" | "theme" | "content"; title: string; snippet: string; href: string; meta: string };

/**
 * Permission-filtered retrieval (spec §02 "AI-assisted synthesis"). Every query runs with the caller's
 * JWT, so RLS decides what can be retrieved: clients never receive employee-only content, and only
 * published shared representations (never private sources) are searchable. Retrieval does not train anything.
 */
export async function retrieve(question: string, limit = 5): Promise<Citation[]> {
  const q = question.trim().slice(0, 300);
  if (!q) return [];
  const supabase = await createClient();
  const words = q.replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).filter((w) => w.length > 2).slice(0, 8);
  const tsQuery = words.join(" OR ");
  const [shared, themes, content] = await Promise.all([
    tsQuery
      ? supabase.from("shared_representations").select("id, title, body, offering, period_coarse, confidence").eq("status", "published").textSearch("search", tsQuery, { type: "websearch", config: "english" }).limit(limit)
      : Promise.resolve({ data: [] as never[] }),
    words.length ? supabase.from("themes").select("id, title, summary, limitations").or(words.map((w) => `title.ilike.%${w}%`).join(",")).limit(3) : Promise.resolve({ data: [] as never[] }),
    words.length ? supabase.from("content_items").select("id, title, body, kind, audience").or(words.map((w) => `title.ilike.%${w}%`).join(",")).limit(3) : Promise.resolve({ data: [] as never[] }),
  ]);
  const cut = (s: string) => (s.length > 220 ? `${s.slice(0, 217)}…` : s);
  return [
    ...(shared.data ?? []).map((r) => ({ id: r.id, kind: "shared" as const, title: r.title, snippet: cut(r.body), href: `/portal/learning?q=${encodeURIComponent(r.title)}`, meta: `${r.offering} · ${r.period_coarse} · confidence ${r.confidence}` })),
    ...(themes.data ?? []).map((t) => ({ id: t.id, kind: "theme" as const, title: t.title, snippet: cut(t.summary || t.limitations), href: `/portal/insights/themes/${t.id}`, meta: "Theme" })),
    ...(content.data ?? []).map((c) => ({ id: c.id, kind: "content" as const, title: c.title, snippet: cut(c.body), href: "/portal", meta: c.kind.replace("_", " ") })),
  ].slice(0, limit + 3);
}
