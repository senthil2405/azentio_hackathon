import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/server/authz/policy";
import { getPrincipal } from "@/server/authz/principal";
import { retrieve } from "@/server/aira/retrieve";
import { rateLimit } from "@/server/rate-limit";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Signed-in AIRA: retrieval with citations. Public visitors use the site-content mode in the widget. */
export async function POST(req: Request) {
  const principal = await getPrincipal();
  if (!principal || !authorize(principal, "learning.read").allowed) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const body = z.object({ question: z.string().trim().min(2).max(300) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
  if (!(await rateLimit("aira", principal.userId, 30, 300))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });

  const citations = await retrieve(body.data.question);
  // Retrieval-only mode (owner decision): no generated prose, so nothing can be hallucinated or leaked.
  // Claude synthesis over these same citations can be enabled later with ANTHROPIC_API_KEY.
  const answer = citations.length
    ? `I found ${citations.length} approved item${citations.length === 1 ? "" : "s"} you’re permitted to see. Each reflects a contributor’s view and doesn’t prove market prevalence.`
    : "I couldn’t find approved shared learning on that. Try different words, or browse Shared learning.";
  return NextResponse.json({ answer, citations, mode: "retrieval" }, { headers: NO_STORE });
}
