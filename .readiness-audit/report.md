# Production-readiness audit: azentio.ai portal

**Method:** `prod-readiness` lenses (security, backend, database, DevOps, QA, frontend, AI security, runtime), applied in a single pass (no subagents), plus `yl-audit`'s scaling of expectations to team and stage. **Stage:** hackathon / validating, solo team. **Date:** 2026-10-31.

## Verdict
| Target | Verdict | Why |
|---|---|---|
| **Hackathon judging (local, synthetic data)** | **SHIP** | All P0 acceptance tests pass (22 DB, 20 unit, 9 E2E). The governed learning workflow, tenant isolation and withdrawal invalidation are verified end to end. |
| **Real production with client data** | **HOLD – DO NOT DEPLOY** | Blockers B1–B5 below. Expected at this stage; none is a design flaw. |

## Evidence
- `npm run test:db`: **22/22**. RLS tenant isolation, separate grants, invitations, lifecycle, withdrawal invalidation, cohort suppression, reviewer-note secrecy, policy-recursion regression.
- `npm test`: **20/20**. `authorize()` persona matrix, validation mirrors DB constraints, deterministic synthetic scenarios.
- `npm run test:e2e`: **9/9**. A1 public/protected boundary, A12 no AIRA leakage, A14 illustrative scenario, URL-guessing protections, unapproved-employee denial, honest form labels, security headers, accessibility smoke checks (public + portal).
- Defects found **by** these tests and fixed: memberships policy recursion, a column-level REVOKE that had no effect (reviewer notes), `javascript:` links accepted, OTP email sent a link instead of a code, workspace redirect loop.

## Absence ledger
| Control | Status | Notes |
|---|---|---|
| Server-side authz on every route/action/API/media | **confirmed** | `authorize()` + RLS + SECURITY DEFINER re-checks; tests A1, A2, A12 |
| Tenant from server session only | **confirmed** | `active_workspaces` keyed by JWT `session_id`; forged-org test |
| Deny by default / explicit audience | **confirmed** | `audience NOT NULL`; unknown audience denied (unit) |
| Private source ≠ shared representation | **confirmed** | separate tables; payload snapshot test (A7) |
| 4 separate consents | **confirmed** | append-only `consents`; publish requires `publish_shared`, attribution requires `attribution` |
| Withdrawal invalidates search/themes/AIRA | **confirmed** | same transaction; A9 (DB) + A14 (E2E) |
| Min-cohort suppression (N=3) | **confirmed** | `theme_stats`; repeated posts from one org count once (A8) |
| Audit trail for privileged actions & transitions | **confirmed** | `private.audit_events`, `moderation_events`, `idea_status_changes` |
| In-app notifications + outbox; no false "delivered" | **confirmed** | outbox rows are `queued`; UI says "in-app" |
| Rate limiting (OTP, verify, forms, invites, AIRA) | **confirmed** | Postgres fixed window. IP taken from `x-forwarded-for` (trusted only behind Vercel) |
| Security headers / CSP | **confirmed** | E2E header test. `'unsafe-inline'` scripts is a documented trade-off |
| Protected media signed URLs (300 s) | **unverified** | endpoint authorizes + 404s (tested). Signed-URL issuance untested: local Storage disabled because Docker's image store is corrupt |
| Email delivery (P1) | **not found** | outbox worker not built; in-app only (P0 allows this) |
| Error tracking / tracing (Sentry, OpenTelemetry) | **not found** | B3 |
| Static analysis (Semgrep/CodeQL) | **unverified** | not installed (owner decision); manual OWASP review done |
| Lighthouse / Core Web Vitals lab run | **unverified** | not installed (owner decision); public pages are static, no web fonts, SVG imagery |
| Load testing / latency SLOs | **not found** | targets in plan.md are unvalidated |
| Backups / PITR / restore test | **not found** | B4 |
| Attachments | **deliberately absent** | accepted risk; links only |

## Blockers for production (B) and should-fix (S)
- **B1** Deploy target not provisioned (Vercel project, Supabase cloud project, secrets). Re-enable Storage and verify signed-URL media.
- **B2** Production cohort threshold, suppression policy, retention periods and the production withdrawal SLA must be formally approved (spec §09; THREAT_MODEL open questions).
- **B3** Observability: error tracking with release + source maps, structured logs with a PII allow-list, alerting on auth failures and job errors.
- **B4** Backups: enable PITR, document RPO/RTO, run a restore test.
- **B5** Run Semgrep/CodeQL and a Lighthouse pass in CI. Fix high findings.
- **S1** Email worker for the outbox (idempotent, provider-confirmed status).
- **S2** Replace heuristic sensitive-data scan with a reviewed DLP approach (accepted risk for the hackathon).
- **S3** Add the AIRA widget inside the portal shell (currently on the public site, which shares the session).
- **S4** Theme filters on the feed: add differencing protection if counts per filter are ever exposed (currently per-item only).

- **B6** Turn off `DEMO_MODE` (the one-click persona switcher) for any non-demo deployment.

## Production propagation SLA (statement)
Withdrawal and unpublishing are applied **synchronously in the same database transaction** as the user's action. Search, theme evidence, idea evidence and AIRA retrieval read only `shared_representations`, so the item is gone on the next request (target: well under the 60 s required). Shared-learning pages are rendered dynamically with `Cache-Control: private, no-store`, so no CDN copy exists. **Production SLA: 60 seconds** (approved by the project owner). Material already viewed, screenshotted or copied by others cannot be recalled, and the UI says so.
