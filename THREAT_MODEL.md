# Threat Model: azentio.ai Portal (P0)

Frames: **STRIDE** for the system, **abuser stories** for the multi-tenant product flows, and **LINDDUN** notes for the learning/privacy flows. Produced with `threat-modeler`. Interview answers came from the project owner on 2026-10-31.

```json
{
  "assets": ["client private drafts & org-only observations", "contribution provenance (org_id/author)", "reviewer private notes", "consent records", "role grants & memberships", "invitation tokens", "employee-only content/media/broadcasts", "audit log", "AIRA prompts/index (P1)", "FL client datasets (P2)"],
  "actors": ["malicious client tenant", "over-reaching client admin", "curious/compromised employee", "external attacker/scraper"],
  "entry_points": ["/api/* route handlers", "server actions", "/api/media/:id", "/invite/:token", "OTP request/verify", "demo & hackathon forms", "search/filter params", "report action", "AIRA query (P1)"],
  "trust_boundaries": ["browser ⇄ Next.js server", "Next.js ⇄ Postgres (JWT/RLS)", "tenant A ⇄ tenant B", "client ⇄ employee", "member ⇄ client_admin ⇄ portal_admin", "server ⇄ Claude API", "FL client ⇄ coordinator"],
  "accepted_risks": ["local email catcher (Mailpit) for login during judging", "no attachments in P0 (links only)", "heuristic-only sensitive-data scan + human moderation"],
  "top5": ["T1", "T2", "T3", "T4", "T5"]
}
```

## Top-5 risks (fix first)
| ID | Threat | STRIDE | Likelihood × Impact | Control | Test |
|---|---|---|---|---|---|
| T1 | Tenant breakout: Org A reads Org B's observation via ID guessing, a forged `org_id` param, search counts or exports | I, E | High × Critical | `authorize()` + RLS; tenant from server session only; 404s; the same filter on counts and exports | A2, authz matrix |
| T2 | Client admin escalates (grants moderator/employee, invites into another org, self-enables products) | E | Med × High | Role-grant endpoint allows only `member`/`client_admin` within the active org; entitlements writable by portal_admin only | A4 |
| T3 | Protected media/broadcast fetched by a direct URL | I | High × High | Private buckets; `/api/media/:id` authorises, then issues a signed URL (300 s) | A1 |
| T4 | Re-identification from a published observation (rare region/date/detail) or differencing theme filters | I (LINDDUN: identifiability) | Med × High | Moderator redaction with coarsened region/period fields; provenance kept in a separate table; min-cohort N=3; suppression of narrow filter combinations | A7, A8 |
| T5 | Withdrawn or unpublished content still served from search, theme, AIRA or cache | I | Med × High | Synchronous delete in the same transaction + `revalidateTag`; tests query every surface right after withdrawal | A9 |

## Further threats
| ID | Threat | Control |
|---|---|---|
| T6 | Invitation replay / accepted by the wrong account | token hashed, single-use, 72 h expiry, email-bound; audited |
| T7 | OTP brute force / email enumeration | Supabase OTP + our rate limit (5/15 min per email+IP); uniform responses |
| T8 | Employee without grants reads private drafts or moderates | `moderator` grant required; queue shows only `submitted` items proposed for the community; portal_admin needs a `support_authorisation` |
| T9 | Spoofed employee via the `@azentio.com` suffix alone | requires an approved employee `role_grant` **and** a verified email |
| T10 | Repudiation of moderation or role changes | append-only `audit_events` (no UPDATE/DELETE privilege) |
| T11 | Stored XSS through observation text in moderator/feed views | React escaping, no `dangerouslySetInnerHTML`, CSP; markdown off in P0 |
| T12 | CSRF on server actions | Next.js server-action origin checks + SameSite cookies |
| T13 | Spam/DoS on public forms | rate limit, Vercel Firewall rules at deploy, server validation |
| T14 | Prompt injection via published contributions into AIRA (P1) | retrieval only over shared reps; system prompt treats retrieved text as data; no tools with side effects; `/llm-security` audit |
| T15 | Private drafts leaking into logs/AI payloads | structured logger with field allow-list; no LLM calls on drafts |
| T16 | FL: update leakage / poisoning (P2) | clipping, norm-outlier rejection, min participants; honest labels (no secure aggregation or DP claimed unless implemented) |

## Open questions
1. Production cohort threshold and suppression policy: needs approval before launch (spec §09).
2. Retention period for consent history and moderation decisions: to be documented. Proposed for P0: keep for the hackathon; production policy TBD.
3. Email provider for P1: not supplied yet.
