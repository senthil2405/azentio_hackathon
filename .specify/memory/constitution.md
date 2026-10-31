# azentio.ai Portal Constitution

Source of truth for requirements: `SpecialChallengeDoc.pdf` (Hackathon Build Requirements v1.0). When a spec or plan conflicts with this constitution, the constitution wins.

## Core Principles

### I. Deny by Default, Enforced on the Server (NON-NEGOTIABLE)
- Every protected resource (page data, API route, server action, media file, search result, count, export, AIRA retrieval) passes through one `authorize(principal, action, resource)` policy function, with Postgres Row-Level Security as an independent second layer.
- Access requires all three: the resource **audience** permits the identity, the active **tenant membership** is valid where applicable, and the **action** is granted.
- `audience` is NOT NULL on every resource. `public` is an explicit value, never a fallback for missing metadata.
- Authority is never derived from navigation, localStorage, cookies set by the client, an email suffix alone, or a user-supplied tenant ID. The active workspace is held in the server session.
- Resources the caller may not see return 404, not 403, so their existence is not leaked.

### II. Least Privilege, Separate Grants
- Being an employee does not imply being an administrator. Publish-video, moderate-learning, invite-users, change-roles, product-owner and portal-admin are **separate grants**.
- Client administrators act only within their own organisation and can never grant employee, moderator, publisher or portal-admin roles, or self-enable products.
- Portal-admin access to private client content requires an explicit support/moderation authorisation record; it is never implied by the role. All privileged actions are audited.

### III. Private Source ≠ Shared Representation
- A contribution starts as a **private draft**. Saving never shares it.
- Broadening visibility requires an explicit author choice (private / my organisation / propose to community), the matching consent, and moderator approval.
- Published copies live in a separate table, contain only reviewed fields, and are produced by a dedicated serializer. Tenant IDs, author profiles, original attachments, hidden metadata and reviewer notes never appear in shared payloads.
- Four consents are recorded separately and never inferred from one another: (a) store/process, (b) publish shared representation, (c) attribute author/organisation, (d) future training/federated programme. Joining a workspace is not consent to any of them.

### IV. Privacy-Preserving Learning
- De-identified wording is the default; attribution is opt-in and reviewed. Geography, dates and unusual details are coarsened when they could identify a contributor or customer.
- Shared trend statistics require at least **N distinct contributing organisations** (configurable; N = 3 for judging). Small cohorts and differencing-friendly filter combinations are suppressed. Repeated posts from one organisation count once.
- Raw private records never enter shared analytics, search/vector indexes, logs or AI-provider payloads unless a documented policy explicitly permits that processing.
- Only synthetic data is used throughout the hackathon.

### V. Withdrawal and Change Are Immediate and Honest
- Withdrawal removes the shared copy from search, the vector index, themes and caches **in the same transaction/request** (the requirement is ≤ 60 s). The production propagation SLA is documented. The UI states that already-viewed material and third-party copies cannot be recalled.
- A material edit to a published contribution creates a new version that requires review; an audience is never widened silently.
- Every lifecycle transition follows an explicit allowed-transition table and emits an audit event.

### VI. Honest Labelling
- Synthetic data and simulated outputs are labelled as such; a sandbox result is never presented as an approved credit or business decision.
- Notifications show their true state (stored / queued / sent by provider). Nothing is labelled "email delivered" without provider confirmation.
- AI-generated themes keep their evidence links and uncertainty. Popularity is never presented as prevalence or causation.
- Federated-learning controls that are simulated are labelled simulated. Plain averaging is never described as secure aggregation or a formal privacy guarantee. No "untraining" is promised.

### VII. Test-First on Security-Critical Paths
- The authorization matrix (persona × resource × action), the contribution state machine, payload redaction, the aggregation threshold and withdrawal invalidation are covered by automated tests written **before** their implementation.
- The acceptance tests in PLAN.md §4 (A1–A15) are the definition of done and run in CI.

## Technology and Operational Constraints
- Next.js 16 (App Router, TypeScript strict), Tailwind v4, shadcn/ui; Supabase (Postgres, Auth email OTP/magic link, private Storage, pgvector); deployment on Vercel. Local Supabase is used for development until cloud keys exist.
- Employee identity = a verified `@azentio.com` email **and** an organiser-approved employee membership. Clients join only through single-use, expiring invitations or an approval workflow.
- Protected media is served only through an authorizing endpoint that issues short-lived signed URLs. No public bucket holds protected content.
- Private responses use `Cache-Control: private, no-store`. Public pages use static rendering/ISR with tag revalidation.
- Notifications use persisted notification and outbox records with idempotent delivery.
- Configuration numbers (TTLs, limits, thresholds, SLAs) must cite a source or be marked as a target to be validated. None are invented.
- Secrets live only in environment files that are never committed.

## Development Workflow and Quality Gates
- Every module goes through spec → plan → tasks → test-first implementation → review.
- A pull request may merge only when lint, typecheck, unit tests, the authz matrix and the relevant acceptance tests pass, and static analysis reports no high-severity findings.
- P1 and P2 work starts only after every P0 acceptance test is green.

## Governance
This constitution supersedes other practices in this repository. Amendments require a written rationale, the project owner's approval, and an update to the affected specs and tests.

**Version**: 1.0.0 | **Ratified**: 2026-10-31 | **Last Amended**: 2026-10-31
