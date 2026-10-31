---
name: threat-modeler
description: Build a real threat model for a codebase, service, or feature — before the code review, before the pen test, before launch. Picks the right frame (STRIDE for systems, attack-tree for features, abuser-stories for product flows), works through assets / actors / entry points / trust boundaries via interview + code-read, and produces a structured THREAT_MODEL.md that downstream skills can use to scope a targeted scan. Use when the user says "threat model this", "what's the attack surface", "do a STRIDE analysis", "what could go wrong here", "model the threats", or before any launch touching auth, payments, PII, or multi-tenancy.
---

# threat-modeler — figure out what to defend before you defend it

## When to use this skill

Trigger when the user wants a *planned* security view, not a generic scan. Strong signals:

- "threat model this", "do a STRIDE analysis", "what's the attack surface"
- "what could an attacker do here"
- Before any new feature touching auth, payments, file uploads, PII, multi-tenancy, or webhooks
- Before a SOC 2 / ISO 27001 / pen-test engagement
- A new service is being designed and there's no security context yet

Do *not* trigger for: a static code review (use `security-sentinel`), incident response (you need a responder), or generic "make this secure" requests where no specific surface has been picked. Pin a scope first.

## The output contract

A `THREAT_MODEL.md` file with two layers:

1. **A machine-readable section** (front matter or JSON block) — downstream skills (`security-sentinel`, `code-auditor`) can parse it to scope what they look for. Lists assets, actors, entry points, trust boundaries, and threats with severity scores.
2. **A human-readable section** — the actual narrative. A new engineer should be able to read it in 15 minutes and understand what's worth attacking, what's worth defending, and where the team has *deliberately* accepted a risk.

Plus three concrete deliverables alongside the doc:

- An **assumption log** — every claim the model rests on, so the next reviewer can verify or invalidate
- An **open-questions list** — the things the interview couldn't resolve; goes back to the user or to engineering
- A **top-5 risk list** — the five things to fix this sprint, ranked by likelihood × impact

If the model has 80 threats and no ranking, it's a list, not a model. Rank or don't ship.

## Workflow

### 1 — Pick the frame

Different surfaces fit different frames. Pick one before starting:

- **STRIDE** (Spoofing, Tampering, Repudiation, Information disclosure, DoS, Elevation of privilege) — for systems and services. The default for "model this API".
- **Attack-tree** — for one specific high-value flow (payment, signing, identity proofing). The root is the attacker goal; the branches are how they'd get there.
- **Abuser stories** — for products with end users (multi-tenant SaaS, marketplaces, social). Mirror image of user stories: "as a malicious tenant I want to see other tenants' data so that…"
- **LINDDUN** — for privacy-heavy systems (Linkability, Identifiability, Non-repudiation, Detectability, Disclosure, Unawareness, Non-compliance). Pull this in *in addition to* STRIDE when GDPR/HIPAA/biometric data is on the table.

State the choice in one line in the doc. If a system has two distinct surfaces (e.g., a public API + an admin app), do two passes with two frames.

### 2 — Bootstrap from code (if there is code)

Before asking the user anything, read the code and infer what you can. Goal: walk into the interview with informed questions, not a blank slate.

This pack is web-app focused — the grep recipes below assume **Node.js + React** (Express / Fastify / Next.js / NestJS on the server; React / Vue / Svelte on the client). For other stacks adapt the patterns; the categories are universal.

For each entry point, identify:

**HTTP routes — what's public, what's authenticated, what's admin-only**
```bash
# Express / Fastify route surface
rg -t ts -t js '\.(get|post|put|patch|delete)\s*\(' src/ | head -40
# Next.js app router
fd 'route\.(ts|js)' app/ | head -20
# Per-route auth middleware (or lack thereof)
rg -B2 'requireAuth|withAuth|isAuthenticated|@UseGuards' src/
```

**Background jobs / cron — what runs on its own authority**
```bash
rg -t ts -t js 'cron|bullmq|agenda|node-cron|setInterval|setTimeout.*hours?\)'
```

**Webhook handlers — what external callers can trigger**
```bash
rg -t ts -t js 'webhook|/hooks/|stripe.webhook|sendgrid|svix' src/
```

**Client-side trust — what the React layer assumes about server response**
```bash
# dangerouslySetInnerHTML is the canonical XSS surface in React
rg 'dangerouslySetInnerHTML' src/
# direct DOM writes that bypass React
rg 'innerHTML\s*=|document\.write' src/
# routes that take user input directly into the URL
rg 'window\.location|router\.push\([^,)]*(query|params)'
```

**File / blob storage — what's user-controlled, what's served back to other users**
```bash
rg -t ts -t js 'multer|formidable|busboy|S3.*Upload|presigned'
```

**Outbound calls — where user input flows out to other services (SSRF surface)**
```bash
rg -t ts -t js 'fetch\(|axios\.|undici|got\(' src/ | rg 'req\.|body\.|query\.'
```

**Database access — what queries take user input**
```bash
# raw SQL with template strings = parameterization audit
rg -t ts -t js 'raw\(|query\(`|sql`' src/
# Mongo: user-controlled keys can become $-operators
rg -t ts -t js '\.find\(.*req\.body|\.findOne\(.*req\.body' src/
```

**Secrets — what's in env vs hardcoded**
```bash
rg -t ts -t js 'process\.env\.' src/ | head -20
# anything that looks like a baked-in key
rg -t ts -t js -P '(sk_live|sk_test|AIza|AKIA|ghp_)[A-Za-z0-9_-]+'
```

Build a one-page "what I see" summary. This is *not* the threat model yet. It's the raw map.

### 3 — Interview the user to fill gaps

The code can't tell you:

- **Who's a threat?** External attackers, malicious users, malicious tenants in a shared platform, compromised employees, supply-chain attackers, hostile nation-states, customers' angry exes (real for consumer apps), automated scrapers?
- **What's actually sensitive?** Code doesn't know "this column holds adoption records sealed by court order" vs "this column holds usernames".
- **What's the blast radius if X is breached?** Regulatory? Reputational? Existential?
- **What's been deliberately accepted?** "Yes we know the admin app trusts the network — we're inside the VPN and that's by design." Threats that have been considered and accepted are not findings.

Run the interview short and pointed (see [`interview-guide.md`](interview-guide.md) for the question bank). Cap it at 30 minutes — if there's a 90-minute discussion to be had, surface that as "needs follow-up" and don't try to do it inside the threat model.

### 4 — Map the four pillars

Now write the structured part of the doc:

- **Assets**: what's worth protecting. Be specific. "User PII" is lazy; "billing addresses, IP at signup time, support-chat transcripts" is real.
- **Actors**: who would attack and why. Internal vs external. Authenticated vs anonymous. Skilled (nation-state, organized fraud) vs opportunistic (a script kiddie hitting your signup endpoint).
- **Entry points**: every place untrusted data enters the system. Every. Place. HTTP, GraphQL, webhooks, file upload, OAuth callback, email parsing, push notification tokens, support-form attachments.
- **Trust boundaries**: where authority shifts. The browser ⇄ backend boundary. Backend ⇄ third-party API. Application ⇄ database. Tenant A ⇄ tenant B. Free user ⇄ paid user ⇄ admin.

Each pillar gets a short numbered list. No paragraphs. The structure exists to be queried.

### 5 — Walk the frame

For STRIDE: for each asset, for each relevant entry point, ask the six questions:

| Letter | Threat | Example for "user profile API" |
|---|---|---|
| **S** | Spoofing | Can someone impersonate another user? (Stolen token, session fixation, password reset weakness) |
| **T** | Tampering | Can data be modified by someone who shouldn't? (IDOR on PUT, mass-assignment, missing signature on webhook) |
| **R** | Repudiation | Can a real action be denied? (No audit log on sensitive changes; logs trivially editable) |
| **I** | Information disclosure | Can data leak to someone who shouldn't see it? (IDOR on GET, verbose errors, side-channels) |
| **D** | DoS | Can someone make this unavailable? (Unbounded query, no rate limit, expensive endpoints without auth) |
| **E** | Elevation of privilege | Can a low-priv user become high-priv? (Role check missing on admin route; JWT alg confusion) |

Skip questions that genuinely don't apply ("repudiation isn't relevant to this read-only public endpoint") and *say so* — silence reads as oversight, but an explicit "N/A: this endpoint is unauthenticated and stateless" reads as rigor.

See [`stride-reference.md`](stride-reference.md) for the full prompt bank per letter, including the modern web concerns STRIDE alone doesn't surface (SSRF, deserialization, subdomain takeover, OAuth scope creep, race conditions on state machines).

### 6 — Score and rank

For each threat:

- **Likelihood**: 1 (theoretical) → 5 (someone will try this in the first month)
- **Impact**: 1 (annoyance) → 5 (existential)
- **Severity** = likelihood × impact (1–25)
- **Mitigation status**: existing / partial / none

Sort by severity. Top 5 go into the "fix this sprint" list. The rest sit in the model as known risks with planned mitigations or accepted-risk notes.

Be honest about likelihood. A SQL injection in code that doesn't touch user input is likelihood 1 even if impact is 5. A missing rate limit on `/login` is likelihood 5 because *someone is going to try it tomorrow*.

### 7 — Capture assumptions and open questions

The model is only valid under specific assumptions. Write them down explicitly:

- "Assumes the admin app is only reachable from the corp VPN."
- "Assumes Stripe is the only PCI-handling component."
- "Assumes session tokens in cookies are sufficient for CSRF protection because of SameSite=Lax."

If any assumption flips later (admin app gets a public endpoint; you start handling PANs; you switch to a SPA on a different domain), the model needs a re-run. Note it.

Open questions go in their own section, each with an owner. "Who actually has access to the prod DB read-replica?" is a question for ops, not a guess for the model.

### 8 — Hand off

Done. The doc is the artifact. Now:

- Use it as input to `security-sentinel` — "scan with priority on the top-5 threats from THREAT_MODEL.md"
- Use it as input to `api-architect` for new endpoints — every new entry point inherits the boundary controls the model demands
- Re-run quarterly *or* when any assumption changes (whichever is sooner)

## Patterns and anti-patterns

✅ **Do**:
- Threat-model the *change*, not the whole company. A model for "the new invitations feature" is more useful than a model for "all of our SaaS".
- Name assumptions explicitly. The doc's job is to be *invalidated* later; named assumptions make that easy.
- Include the things you *aren't* worried about and why. The absence of a concern reads as oversight; the explicit decision reads as rigor.
- Walk the model with the team after writing it. A model the team disagrees with is more useful than one they merely nod at.

❌ **Don't**:
- Don't write a generic threat model from a template. If yours could equally describe Slack and Stripe, it's describing nothing.
- Don't list 80 threats without ranking. Pasta isn't a model.
- Don't conflate threat (what attacker would do) with vulnerability (how the code lets them). Threat → goal; vulnerability → mechanism. The model is the goals; the scan finds the mechanisms.
- Don't model "an APT with unlimited budget" if you're a 5-person company shipping a SaaS. Pick threats proportional to who actually targets you.
- Don't make the model a one-time artifact. A model that hasn't been touched in a year is decoration.

## Example invocation

> User: "We're shipping an invitations feature next week. Threat-model it."

1. **Frame**: STRIDE for the invitation endpoints; abuser stories for the user-facing accept page.
2. **Bootstrap**: read `src/api/invitations/` — 5 endpoints, JWT auth on 3, public + token-based on 2. Webhook handler for email-bounce notifications. Send-email goes through a third-party (SendGrid).
3. **Interview** (15 min with the user):
   - Sensitive assets: pending invitation tokens (one-time signup grant), email addresses (PII), inviter identity.
   - Actors of concern: random external attackers, malicious users trying to invite themselves to other orgs, scrapers harvesting valid emails.
   - Trust boundaries: browser ⇄ public-accept endpoint; backend ⇄ SendGrid webhook; tenant A ⇄ tenant B.
   - Accepted risks: "We don't try to prevent users from inviting fake emails — we expect bounce rates."
4. **Pillars**:
   - Assets: invitation token (high), org membership grant (high), email address (medium)
   - Actors: ext-anon, ext-authenticated-other-org, malicious-tenant, automated-scraper, sendgrid-compromise
   - Entry points: POST /invitations (auth), GET /invitations/by-token/:t (public+rl), POST /accept (public+token), POST /webhooks/sendgrid (public+sig)
   - Trust boundaries: 3 listed above
5. **STRIDE walk** — 14 threats identified, e.g.:
   - **S** Token-guessing on /by-token → likelihood 4, impact 4 (sev 16): need 128-bit token + rate limit
   - **I** Enumeration via "email already invited" error → likelihood 5, impact 2 (sev 10): return same response either way
   - **R** No audit log on accept → likelihood 3, impact 3 (sev 9): log to existing audit table
   - **E** Mass-assignment on invitation create lets a regular user set `role: admin` → likelihood 4, impact 5 (sev 20): strict allowlist in the handler
   - **D** No rate limit on /by-token enables 100k req/min crawl → likelihood 4, impact 3 (sev 12): rate-limit by IP and by token-prefix
   - **T** SendGrid webhook signature check is currently absent → likelihood 3, impact 4 (sev 12): verify signature with `crypto.timingSafeEqual`
6. **Top-5 ranked** for the sprint: mass-assignment, token-guessing, sendgrid signature, rate limit on /by-token, enumeration.
7. **Assumptions**: tokens are 128-bit random from `crypto.randomBytes`; SendGrid is the only path; accept endpoint always requires an authenticated session.
8. **Open questions**: do we want a "this invitation has been forwarded" detection? (privacy team to decide).
9. Output: `docs/security/THREAT_MODEL-invitations.md` with all of the above, and a structured front-matter block for `security-sentinel` to consume.

## See also

- `security-sentinel` — runs the targeted scan informed by this model
- `api-architect` — sets the auth/boundary controls the model demands for new endpoints
- `code-auditor` — finds the specific bugs corresponding to the threats this model named
- `resilience-engineer` — many tampering/repudiation threats are closed by typed errors + structured logging
- Reference files: [`stride-reference.md`](stride-reference.md), [`interview-guide.md`](interview-guide.md)

## Compatibility

Works in both **Claude Code** (native SKILL.md auto-routing) and **OpenAI Codex CLI** (via the [`for-codex/AGENTS.md`](../../for-codex/AGENTS.md) routing table). No code execution required — this is an interactive skill that reads files and asks questions; safe to run in any repo.

## Attribution

The *structural pattern* (split planning from finding; bootstrap-from-code then interview; rank by likelihood × impact) is inspired by Anthropic's open-source [`defending-code-reference-harness`](https://github.com/anthropics/defending-code-reference-harness), specifically how it separates a planning skill (`/threat-model`) from a finding skill (`/vuln-scan`). That repo is Apache 2.0, focused on C/C++ memory bugs.

This skill targets the **React + Node.js / TypeScript** stack the rest of `fullstack-agent-skills` is built for. Every workflow step, prompt, grep recipe, STRIDE prompt-bank, interview question, and example is written from first principles for web apps — JWT and OAuth pitfalls, IDOR and mass-assignment, SSRF and CORS, prototype pollution, Next.js getServerSideProps leaks, multi-tenant row-level guards. MIT licensed.
