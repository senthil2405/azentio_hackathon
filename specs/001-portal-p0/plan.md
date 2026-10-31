# Implementation Plan / Architecture: 001-portal-p0

Produced with `production-architecture-guardian` (design mode) and `supabase-postgres-best-practices`. Labels follow the guardian's evidence rule: `approved: owner` = approved by the project owner on 2026-10-31; `target` = to be validated by measurement; `verified: spec` = stated in SpecialChallengeDoc.pdf.

## 1. System context
```
Browser ──HTTPS──► Next.js 16 on Vercel (RSC + Route Handlers + Server Actions)
                     │  every data access → authorize() → Supabase (service role, server only)
                     ├──► Supabase Postgres (RLS on, pgvector, FTS)  ◄── single source of truth
                     ├──► Supabase Auth (email OTP)  ──► Mailpit (dev/judging) / provider (P1)
                     ├──► Supabase Storage (private buckets) ◄── /api/media/:id issues signed URLs
                     └──► Claude API (P1 AIRA) — receives only approved shared representations
Outbox worker (cron route) ──► email provider (P1) — idempotency key per message
FL track (P2): 3 client containers + coordinator — separate service, no portal DB access
```

## 2. Key decisions
| # | Decision | Rationale | Evidence |
|---|---|---|---|
| D1 | One `authorize()` module (`src/server/authz/`) + RLS policies mirroring it | Two independent layers; a single place to test the persona matrix | verified: spec §03 IAM-01 |
| D2 | Server talks to Postgres with a **request-scoped client carrying the user JWT** (RLS applies). Service role is used only by audited admin jobs (outbox, seeding) | RLS is real defence in depth, not bypassed by default | supabase best practices |
| D3 | Active workspace stored server-side in `user_sessions.active_org_id`, validated against `memberships` per request | Never trust a client-supplied tenant ID | verified: spec IAM-01 |
| D4 | CQRS-lite: `contributions` / `contribution_versions` (private write model) vs `shared_representations` (public-to-community read model) | Shared payloads physically cannot contain private columns | verified: spec §08, §09 |
| D5 | FTS (`tsvector` column + GIN index) and embeddings (`pgvector`, HNSW) live **on `shared_representations` rows only** | Withdrawal = delete or flag the row in the same transaction, so invalidation is synchronous | verified: spec §08 (≤60 s) |
| D6 | Theme stats come from a SQL function that counts `DISTINCT org_id` and returns NULL below `app_config.min_cohort` | Suppression lives server-side, not in the UI | verified: spec §09 |
| D7 | Outbox table written in the same transaction as each state change. Delivery worker uses `idempotency_key UNIQUE` | Exactly-once effect on retries | verified: spec §08 |
| D8 | Public routes static/ISR, tagged `public-content`. Portal routes dynamic with `Cache-Control: private, no-store` | Low cost + no private data in shared caches | target |
| D9 | Rate limiting: Postgres-backed fixed-window limiter (`rate_limits` table) on OTP request, invitation accept, demo/hackathon forms, report action, plus Vercel Firewall rules at deploy | The owner did **not** accept "no WAF" | approved: owner |
| D10 | Sensitive-content scan = deterministic heuristics (account/IBAN/PAN/email/phone patterns, synthetic customer-name list); flags go to moderator; no LLM on private drafts | Accepted risk: heuristic only. Satisfies "no raw data to AI provider" | approved: owner |
| D11 | Moderator grant only for employees | Neutral reviewer; no cross-client moderation | approved: owner |
| D12 | 404 for unauthorised resource reads; 401 when there's no session on portal APIs | No existence oracle | constitution I |

## 3. Policy values
| Setting | Value | Label |
|---|---|---|
| Invitation expiry | 72 h | approved: owner |
| Session idle / absolute | 8 h / 7 days | approved: owner |
| Signed media URL lifetime | 300 s | approved: owner |
| Min distinct orgs for trend stats (judging) | 3 | verified: spec §09 + approved: owner |
| Production threshold / suppression policy | must be re-approved before launch | verified: spec §09 |
| Withdrawal propagation | synchronous (same request) in-app; documented SLA 60 s; CDN/third-party copies out of scope and disclosed | approved: owner |
| Rate limits (OTP request per email/IP, form posts per IP) | 5 per 15 min / 10 per 15 min | target, to be tuned |
| Contribution text limits | title 120, description 4000 chars | target |

## 4. Data model (migration 0001)
`organisations(id, name, kind{client,azentio}, industry, region)`
`profiles(user_id→auth.users, email_verified, display_name)`
`memberships(user_id, org_id, status{active,revoked}, client_role{member,client_admin}?, approved_by)`
`role_grants(user_id, grant{employee,publisher,moderator,product_owner,portal_admin}, granted_by, created_at)` (note: `employee` requires the azentio domain)
`support_authorisations(admin_id, org_id, reason, expires_at)`
`invitations(id, org_id, email_norm, client_role, token_hash UNIQUE, expires_at, used_at, invited_by)`
`entitlements(org_id, product_id)` · `products(id, slug, name, public)`
`content_items(id, kind{banner,page,insight,release_note,knowledge}, audience NOT NULL, org_id?, body, owner_id, review_date)`
`media_assets(id, storage_path, audience NOT NULL, org_id?, kind{video,recording,image})` · `broadcasts(id, title, audience NOT NULL, starts_at, media_id)`
`contributions(id, author_id, org_id, visibility{author_only,org,propose_community}, state, current_version_id, created_at)`
`contribution_versions(id, contribution_id, n, type, offering, industry, region, period_start, period_end, evidence_type, confidence, title, body, links[], sensitive_flags jsonb)`
`consents(contribution_id, kind{store_process,publish_shared,attribution,training}, granted bool, actor_id, at)` (append-only)
`moderation_events(id, contribution_id, version_id, actor_id, from_state, to_state, reason, reviewer_note_private)`
`shared_representations(id, contribution_id, version_id, title, body, offering, industry, region_coarse, period_coarse, evidence_type, confidence, attribution_org_name?, status{published,unpublished}, search tsvector, embedding vector?)` (**never** stores author_id or org_id in API-visible columns; `org_id` is kept in a separate `shared_rep_provenance` table readable only by the stats function)
`reports(id, shared_rep_id, reporter_id, reason, state)`
`themes(id, title, summary, limitations, offering)` · `theme_evidence(theme_id, shared_rep_id)`
`improvement_ideas(id, title, problem, offering, proposed_outcome, owner_team, priority, status, updated_at)` · `idea_evidence(idea_id, shared_rep_id)` · `idea_status_changes(idea_id, from, to, actor_id, public_note, at)`
`notifications(id, user_id, kind, payload, read_at)` · `outbox(id, idempotency_key UNIQUE, channel, payload, state{queued,sent,failed}, attempts)`
`audit_events(id, actor_id, action, resource_type, resource_id, before, after, at)` (append-only via RLS + no UPDATE/DELETE grant)
`demo_requests`, `hackathon_registrations`, `playground_runs(org_id?, user_id, product_id, inputs, outputs, synthetic=true)`, `rate_limits`, `app_config`.

## 5. Contribution state machine
| From | Action | To | Actor |
|---|---|---|---|
| — | create | draft | author |
| draft | submit (visibility=propose_community) | submitted | author |
| draft | share in org (visibility=org) | org_shared | author (no moderation; org-only) |
| submitted | request_clarification | returned | moderator |
| returned | resubmit | submitted | author |
| submitted | reject | rejected | moderator |
| submitted | publish | published (+ shared_rep created) | moderator |
| published | report → unpublish | under_review (shared_rep.status = unpublished) | moderator |
| under_review | republish / remove | published / removed | moderator |
| published | material edit | published + new version in `submitted` | author |
| org_shared / submitted / published / returned | withdraw | withdrawn (shared_rep deleted, theme_evidence/idea_evidence links marked withdrawn) | author |
Anything else returns `409 invalid_transition`.

## 6. Project structure
```
src/app/(public)/…            cloned public site
src/app/(auth)/sign-in, /invite/[token], /onboarding
src/app/portal/employee/…, /portal/client/…, /portal/moderation/…, /portal/insights/…, /portal/admin/…
src/app/api/media/[id]/route.ts
src/server/authz/ (policy.ts, principal.ts, audiences.ts)  src/server/db/  src/server/learning/ (state machine, serializers, stats)
supabase/migrations/, supabase/seed.sql (3 synthetic client orgs + personas)
tests/unit (vitest: authz matrix, state machine, serializer snapshot, stats) · tests/e2e (playwright personas)
```
