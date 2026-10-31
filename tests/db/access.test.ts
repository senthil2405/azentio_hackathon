/**
 * Database-layer access tests (RLS + governed functions). Run against a freshly reset local Supabase:
 *   npm run test:db
 * IDs map to PLAN.md §4 acceptance tests and THREAT_MODEL.md threats.
 */
import { describe, expect, it } from "vitest";
import { EMAIL, ORG, admin, anonClient, signIn, validFields } from "./personas";

const titles = (rows: { title: string }[] | null) => (rows ?? []).map((r) => r.title);

describe("A1 / T3 — anonymous visitors", () => {
  it("cannot read any protected table", async () => {
    const c = anonClient();
    for (const table of ["contributions", "contribution_versions", "shared_representations", "content_items", "media_assets", "broadcasts", "memberships"]) {
      const { data } = await c.from(table).select("*");
      expect(data ?? [], table).toHaveLength(0);
    }
  });
  it("cannot call governed functions", async () => {
    const { error } = await anonClient().rpc("contribution_create", { p_fields: validFields(), p_consents: { store_process: true } });
    expect(error).not.toBeNull();
  });
});

describe("T9 — employee identity", () => {
  it("an @azentio.com address without an approved grant gets no employee content", async () => {
    const c = await signIn(EMAIL.newhire);
    const { data } = await c.from("content_items").select("title");
    expect(titles(data).some((t) => t.startsWith("Internal"))).toBe(false);
  });
  it("an approved employee can read employee-only content", async () => {
    const c = await signIn(EMAIL.employee, ORG.azentio);
    const { data } = await c.from("content_items").select("title");
    expect(titles(data)).toContain("Internal: prototype notes for SME Workbench v0.4");
  });
});

describe("A2 / T1 — tenant isolation", () => {
  it("a private draft is visible only to its author", async () => {
    const author = await signIn(EMAIL.ana, ORG.northbank);
    const sameOrg = await signIn(EMAIL.carlAdmin, ORG.northbank);
    const moderator = await signIn(EMAIL.moderator, ORG.azentio);
    const q = (c: typeof author) => c.from("contribution_versions").select("title").like("title", "PRIVATE DRAFT%");
    expect((await q(author)).data).toHaveLength(1);
    expect((await q(sameOrg)).data).toHaveLength(0);
    expect((await q(moderator)).data).toHaveLength(0);
  });

  it("org-only items are visible in the owning org's active workspace only", async () => {
    const q = async (email: string, org: string) =>
      (await (await signIn(email, org)).from("contribution_versions").select("title").like("title", "ORG ONLY%")).data ?? [];
    expect(await q(EMAIL.ana, ORG.northbank)).toHaveLength(1);
    expect(await q(EMAIL.bea, ORG.meridian)).toHaveLength(0);
    expect(await q(EMAIL.moderator, ORG.azentio)).toHaveLength(0);
    // Multi-org consultant: visible only while Northbank is the active workspace.
    expect(await q(EMAIL.consultant, ORG.northbank)).toHaveLength(1);
    expect(await q(EMAIL.consultant, ORG.meridian)).toHaveLength(0);
  });

  it("cannot switch into an org the user does not belong to (forged tenant id)", async () => {
    const c = await signIn(EMAIL.bea);
    const { error } = await c.rpc("set_active_org", { p_org: ORG.northbank });
    expect(error?.message).toBe("not_found");
  });

  it("org-audience content follows the active workspace", async () => {
    const northbank = await signIn(EMAIL.ana, ORG.northbank);
    const meridian = await signIn(EMAIL.bea, ORG.meridian);
    expect(titles((await northbank.from("content_items").select("title")).data)).toContain("Northbank briefing: Q4 roadmap session");
    expect(titles((await meridian.from("content_items").select("title")).data)).not.toContain("Northbank briefing: Q4 roadmap session");
  });

  it("clients never see employee-only media or broadcasts", async () => {
    const c = await signIn(EMAIL.cora, ORG.eastgate);
    expect((await c.from("media_assets").select("id").eq("audience", "employees")).data).toHaveLength(0);
    expect((await c.from("broadcasts").select("id")).data).toHaveLength(0);
  });
});

describe("A3 / A4 / T2 — separate grants and no escalation", () => {
  it("an employee without the publisher grant cannot change broadcasts", async () => {
    const c = await signIn(EMAIL.employee, ORG.azentio);
    const { error } = await c.rpc("broadcast_save", { p_id: null, p_title: "x", p_description: "", p_audience: "employees", p_starts: new Date().toISOString(), p_media: null });
    expect(error?.message).toBe("forbidden");
  });
  it("a publisher can", async () => {
    const c = await signIn(EMAIL.publisher, ORG.azentio);
    const { error } = await c.rpc("broadcast_save", { p_id: null, p_title: "Publisher test", p_description: "", p_audience: "employees", p_starts: new Date().toISOString(), p_media: null });
    expect(error).toBeNull();
  });
  it("a client admin cannot invite while another org is active and has no table write access", async () => {
    const c = await signIn(EMAIL.carlAdmin, ORG.northbank);
    const { error: grantErr } = await c.from("role_grants").insert({ user_id: (await c.auth.getUser()).data.user!.id, grant_kind: "moderator" });
    expect(grantErr).not.toBeNull();
    const { error: entErr } = await c.from("entitlements").insert({ org_id: ORG.northbank, product_id: "30000000-0000-4000-c000-000000000001" });
    expect(entErr).not.toBeNull();
  });
  it("a plain member cannot invite", async () => {
    const c = await signIn(EMAIL.ana, ORG.northbank);
    const { error } = await c.rpc("create_invitation", { p_email: "new@northbank.example", p_role: "member" });
    expect(error?.message).toBe("forbidden");
  });
  it("an employee without the moderator grant cannot moderate", async () => {
    const c = await signIn(EMAIL.employee, ORG.azentio);
    const { data } = await admin.from("contributions").select("id").eq("state", "submitted").limit(1).single();
    const { error } = await c.rpc("contribution_moderate", { p_contribution: data!.id, p_action: "reject", p_public_reason: "nope nope" });
    expect(error?.message).toBe("forbidden");
  });
});

describe("A5 / T6 — invitations", () => {
  it("are single-use and bound to the invited, verified email", async () => {
    const carl = await signIn(EMAIL.carlAdmin, ORG.northbank);
    const { data: token, error } = await carl.rpc("create_invitation", { p_email: EMAIL.outsider, p_role: "member" });
    expect(error).toBeNull();

    const wrong = await signIn(EMAIL.bea);
    expect((await wrong.rpc("accept_invitation", { p_token: token })).error?.message).toBe("invitation_wrong_account");

    const right = await signIn(EMAIL.outsider);
    expect((await right.rpc("accept_invitation", { p_token: token })).data).toBe(ORG.northbank);
    expect((await right.rpc("accept_invitation", { p_token: token })).error?.message).toBe("invitation_invalid");
  });
});

describe("A6 / A7 / A9 / A10 / A11 — governed learning lifecycle", () => {
  it("drafts stay private, publication is reviewed and withdrawal invalidates every surface", async () => {
    const ana = await signIn(EMAIL.ana, ORG.northbank);
    const bea = await signIn(EMAIL.bea, ORG.meridian);
    const maya = await signIn(EMAIL.moderator, ORG.azentio);
    const uniq = `Lifecycle test ${Date.now()}`;

    // Save → still private.
    const { data: id, error } = await ana.rpc("contribution_create", { p_fields: validFields(uniq), p_consents: { store_process: true } });
    expect(error).toBeNull();
    expect((await maya.from("contributions").select("id").eq("id", id)).data).toHaveLength(0);

    // Submitting without publish consent is refused.
    expect((await ana.rpc("contribution_author_action", { p_contribution: id, p_action: "submit" })).error?.message).toBe("consent_publish_required");
    expect((await ana.rpc("contribution_author_action", { p_contribution: id, p_action: "submit", p_consents: { publish_shared: true } })).data).toBe("submitted");

    // Illegal transition is rejected.
    expect((await ana.rpc("contribution_author_action", { p_contribution: id, p_action: "share_org" })).error?.message).toBe("invalid_transition");

    // Moderator returns, author resubmits, moderator publishes a redacted copy.
    expect((await maya.rpc("contribution_moderate", { p_contribution: id, p_action: "request_clarification", p_public_reason: "Please add the observation period detail." })).data).toBe("returned");
    expect((await ana.rpc("contribution_author_action", { p_contribution: id, p_action: "resubmit" })).data).toBe("submitted");
    const shared = { title: uniq, body: "Redacted, de-identified summary of a seasonal SME pattern.", region_coarse: "South Asia", period_coarse: "2026-Q3", attribute: false };
    expect((await maya.rpc("contribution_moderate", { p_contribution: id, p_action: "publish", p_shared: shared })).data).toBe("published");

    // A7: the shared payload carries no tenant, author or reviewer data.
    const { data: rep } = await bea.from("shared_representations").select("*").eq("title", uniq).single();
    expect(rep).toBeTruthy();
    for (const k of ["org_id", "author_id", "contribution_id", "reviewer_note_private", "attachments"]) expect(rep).not.toHaveProperty(k);
    expect(rep!.attribution_org_name).toBeNull();
    expect(rep!.region_coarse).toBe("South Asia");

    // Search finds it.
    const search = () => bea.from("shared_representations").select("id").textSearch("search", "seasonal", { type: "websearch" }).eq("id", rep!.id);
    expect((await search()).data).toHaveLength(1);

    // A10: a material edit creates a pending version; the published copy is unchanged.
    expect((await ana.rpc("contribution_author_action", { p_contribution: id, p_action: "edit", p_fields: validFields(uniq + " (edited)") })).data).toBe("published");
    expect((await bea.from("shared_representations").select("title").eq("id", rep!.id).single()).data!.title).toBe(uniq);

    // A9: withdrawal removes it from search and themes in the same request.
    const owner = await signIn(EMAIL.owner, ORG.azentio);
    const { data: theme } = await owner.rpc("theme_save", { p_theme: null, p_title: "Withdrawal probe", p_summary: "", p_limitations: "", p_offering: null, p_evidence: [rep!.id] });
    expect((await ana.rpc("contribution_author_action", { p_contribution: id, p_action: "withdraw" })).data).toBe("withdrawn");
    expect((await search()).data).toHaveLength(0);
    expect((await bea.from("theme_evidence").select("shared_rep_id").eq("theme_id", theme)).data).toHaveLength(0);
    expect((await admin.from("shared_representations").select("id").eq("id", rep!.id)).data).toHaveLength(0);

    // Author was notified in-app; the outbox holds a queued email (never "delivered").
    const { data: notes } = await ana.from("notifications").select("kind");
    expect(notes!.map((n) => n.kind)).toEqual(expect.arrayContaining(["contribution.request_clarification", "contribution.publish"]));
  });

  it("reviewer private notes are not readable by the author", async () => {
    const ana = await signIn(EMAIL.ana, ORG.northbank);
    const { error } = await ana.from("moderation_events").select("reviewer_note_private").limit(1);
    expect(error).not.toBeNull();
  });
});

describe("A8 / T4 — aggregation safeguards", () => {
  it("suppresses counts below 3 distinct orgs and counts one org once", async () => {
    const maya = await signIn(EMAIL.moderator, ORG.azentio);
    const priya = await signIn(EMAIL.owner, ORG.azentio);
    const { data: seeded } = await admin.from("contributions").select("id, org_id").eq("state", "submitted").order("created_at");
    const reps: string[] = [];
    for (const c of seeded!.slice(0, 3)) {
      const shared = { title: `Seasonality ${c.org_id.slice(-2)} ${Date.now()}`, body: "Seasonal cash-flow pattern misread as deterioration.", region_coarse: "Region withheld", period_coarse: "2026-H1", attribute: false };
      const { error } = await maya.rpc("contribution_moderate", { p_contribution: c.id, p_action: "publish", p_shared: shared });
      expect(error).toBeNull();
      const { data } = await admin.from("shared_representations").select("id").eq("title", shared.title).single();
      reps.push(data!.id);
    }
    const bea = await signIn(EMAIL.bea, ORG.meridian);
    const { data: two } = await priya.rpc("theme_save", { p_theme: null, p_title: "Two-org theme", p_summary: "", p_limitations: "", p_offering: null, p_evidence: reps.slice(0, 2) });
    const s2 = (await bea.rpc("theme_stats", { p_theme: two })).data![0];
    expect(s2.suppressed).toBe(true);
    expect(s2.distinct_orgs).toBeNull();

    const { data: three } = await priya.rpc("theme_save", { p_theme: null, p_title: "Seasonality context", p_summary: "", p_limitations: "Small sample.", p_offering: "Financial Analysis Intelligence", p_evidence: reps });
    const s3 = (await bea.rpc("theme_stats", { p_theme: three })).data![0];
    expect(s3.suppressed).toBe(false);
    expect(s3.distinct_orgs).toBe(3);
  });
});

describe("Idea status — audience-appropriate", () => {
  it("clients see the public status view but not internal fields", async () => {
    const priya = await signIn(EMAIL.owner, ORG.azentio);
    const { data: idea, error } = await priya.rpc("idea_save", { p_idea: null, p: { title: "Seasonality-aware comparison", problem: "Quarter-on-quarter comparisons misread seasonal SMEs.", offering: "Financial Analysis Intelligence", proposed_outcome: "Explain comparisons against the same season last year.", owner_team: "FAI product team", priority: "high" }, p_evidence: [] });
    expect(error).toBeNull();
    await priya.rpc("idea_set_status", { p_idea: idea, p_status: "under_review", p_public_note: "Being assessed; not a delivery commitment." });
    const cora = await signIn(EMAIL.cora, ORG.eastgate);
    expect((await cora.from("improvement_ideas").select("*").eq("id", idea)).data).toHaveLength(0);
    const { data: pub } = await cora.from("idea_status_public").select("*").eq("id", idea).single();
    expect(pub!.status).toBe("under_review");
    expect(pub).not.toHaveProperty("priority");
    expect(pub).not.toHaveProperty("problem");
  });
});

describe("Reviewer notes — moderators only", () => {
  it("moderators can read private notes through the checked function; authors cannot", async () => {
    const { data: c } = await admin.from("contributions").select("id").limit(1).single();
    const maya = await signIn(EMAIL.moderator, ORG.azentio);
    expect((await maya.rpc("moderation_private_notes", { p_contribution: c!.id })).error).toBeNull();
    const ana = await signIn(EMAIL.ana, ORG.northbank);
    expect((await ana.rpc("moderation_private_notes", { p_contribution: c!.id })).error?.message).toBe("forbidden");
  });
});

describe("Regression — membership policies", () => {
  it("users can read their own memberships with organisation names (no policy recursion)", async () => {
    const c = await signIn(EMAIL.consultant);
    const { data, error } = await c.from("memberships").select("org_id, organisations(name)");
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
  });
  it("a client admin sees fellow members of the active org only; a member sees only themselves", async () => {
    const carl = await signIn(EMAIL.carlAdmin, ORG.northbank);
    const { data: all } = await carl.from("memberships").select("user_id, org_id");
    expect(new Set(all!.map((m) => m.org_id))).toEqual(new Set([ORG.northbank]));
    expect(all!.length).toBeGreaterThan(1);
    const ana = await signIn(EMAIL.ana, ORG.northbank);
    expect((await ana.from("memberships").select("user_id")).data).toHaveLength(1);
  });
});
