# Feature Specification: azentio.ai Website & Collaboration Portal (P0 core)

**Feature Branch**: `001-portal-p0` · **Created**: 2026-10-31 · **Status**: Draft
**Input**: SpecialChallengeDoc.pdf §01–§10 (P0 scope). Governed by `.specify/memory/constitution.md`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Public visitor discovers offerings and requests a demo (Priority: P1)
A visitor browses the public site (home, products, solutions, media, insights, AI Lab, technology, about), watches approved public media, submits a demo request and registers interest in a hackathon. They never see private workspaces, client observations, internal broadcasts or configuration controls.

**Why this priority**: It's the first thing judges see, and it is reused from the prototype.
**Independent Test**: Browse every public route signed out; submit both forms; call every portal API and protected media URL with no session and get 401/404.

**Acceptance Scenarios**:
1. **Given** a signed-out visitor, **When** they open `/products`, **Then** they see the catalogue (Credit Strategy Simulator, SME Credit Decisioning Workbench, Similar Portfolio Intelligence, RIVA).
2. **Given** a signed-out visitor, **When** they request `/api/media/<employee-video-id>` directly, **Then** the response is 404 and no signed URL is issued.
3. **Given** a signed-out visitor, **When** they open `/configurator`, `/playground` or `/live`, **Then** they are redirected to sign-in (these are no longer public as they were in the prototype).
4. **Given** a visitor, **When** they submit the demo form with valid fields, **Then** the request is stored and the confirmation says "received". It does not say "email sent".

---

### User Story 2 - Identity, invitations and workspaces (Priority: P1)
An employee signs in with an email code for a verified `@azentio.com` address **and** an organiser-approved employee membership. A client user accepts a single-use, expiring invitation that names the organisation and role, verifies the invited email, reviews the workspace terms and sharing explanation, and lands in their organisation's dashboard. A user with several memberships picks an active workspace using a switcher.

**Why this priority**: Every other story depends on trusted identity and tenancy (IAM-01/02).
**Independent Test**: Seeded personas sign in; invitation edge cases; an arbitrary external email gets no membership.

**Acceptance Scenarios**:
1. **Given** `someone@azentio.com` without an approved employee membership, **When** they verify their email, **Then** they get no employee access.
2. **Given** an invitation for `ana@bank-a.example` to Org A, **When** `eve@other.example` tries to accept it, **Then** acceptance is refused.
3. **Given** an invitation that is used or expired, **When** someone opens it, **Then** it is rejected and the event is audited.
4. **Given** a user with memberships in Org A and Org B, **When** they switch to Org B, **Then** every later request is scoped to Org B by the server session, and a tenant ID in the request body or URL is ignored.
5. **Given** a first-time client, **When** they join, **Then** the terms screen explains that joining is **not** consent to share or train on data.

---

### User Story 3 - Client contributes an observation with an explicit sharing choice (Priority: P1)
A client member creates a structured observation (type, offering, industry, region, observation period, evidence type, confidence, description). It starts as a private draft. They choose a visibility: private to me / my organisation / propose to the learning community. Each of the 4 consents is recorded separately. They can submit for review, follow its status, amend a returned submission and withdraw a shared contribution.

**Why this priority**: This is the core of the collective-learning workflow (§07, §09).
**Independent Test**: Create → save (still private) → submit → returned → amend → resubmit → published → withdraw; verify visibility at each step as another org's member.

**Acceptance Scenarios**:
1. **Given** a draft, **When** the author clicks Save, **Then** it stays private to the author.
2. **Given** a description containing an account-number pattern, **When** it is submitted, **Then** it is flagged as likely sensitive for moderator review, and the author sees a warning that the scan is not a guarantee.
3. **Given** "my organisation" visibility, **When** a member of Org B searches, **Then** it never appears.
4. **Given** invalid or over-length fields, **When** they are posted directly to the API, **Then** the server rejects them with the same rules as the client.

---

### User Story 4 - Moderator reviews, redacts, publishes, handles reports and withdrawals (Priority: P1)
A learning moderator sees submitted contributions proposed for community sharing (never unsubmitted drafts). They can redact, request clarification, reject (as a duplicate or unsafe), or publish an approved shared version. Publishing creates a separate shared representation that contains only reviewed fields. Every transition is audited and the author is notified in-app. Any authorised participant can report a published item; the moderator can temporarily unpublish it, record a decision and inform the contributor.

**Why this priority**: §08 is the governance core.
**Independent Test**: State-machine tests plus a snapshot test of the published payload's fields.

**Acceptance Scenarios**:
1. **Given** a moderator, **When** they list the queue, **Then** private drafts and org-only items are absent.
2. **Given** a published item, **When** the API returns it to another org, **Then** the payload contains no tenant ID, author profile, attachments or reviewer notes.
3. **Given** a published item that the author materially edits, **Then** a new version enters review and the published copy stays as approved until then.
4. **Given** a withdrawn item, **When** anyone searches, views a theme or asks AIRA in the next request, **Then** it is absent.
5. **Given** a report, **When** the moderator unpublishes it pending review, **Then** the reporter's identity is not disclosed to the contributor.

---

### User Story 5 - Shared learning feed, themes and improvement ideas (Priority: P1)
Authorised participants (client members, and employees with a learning grant) search the approved shared feed with filters (offering, industry, region, period, topic). Moderators or product owners group approved items into themes. A theme shows its supporting evidence, observation period, confidence/limitations, and a distinct-organisation count only when the count is ≥ N. A product owner creates an improvement idea linked to permitted evidence and moves it through Proposed → Under review → Planned → In progress → Released / Not proceeding, with every change audited. Clients see an audience-appropriate status update.

**Why this priority**: Closes the loop described in §10, and is the illustrative scenario the judges will run.
**Independent Test**: Seed 3 synthetic orgs with seasonal-SME observations and run the PDF's illustrative scenario end to end.

**Acceptance Scenarios**:
1. **Given** a theme supported by 2 organisations, **Then** counts are suppressed and a small-sample warning is shown.
2. **Given** 3 posts from one organisation, **Then** they count as 1 distinct organisation.
3. **Given** an idea "Under review", **When** a client views it, **Then** they see the plain-language status, owner team and last update, and no internal discussion.
4. **Given** search counts and suggestions, **Then** they apply the same visibility rules as the records themselves.

---

### User Story 6 - Employee portal (Priority: P2)
An employee dashboard links to the internal Playground, internal Live sessions, experiments, assigned ideas and learning work. The guided Playground lets them choose an offering, inspect synthetic inputs, run a deterministic demo, review evidence and give structured feedback, all labelled "Synthetic data, simulated output, not a credit decision". Internal broadcasts and recordings are visible only to the employee audience. Only publishers can configure them or edit homepage banners.

**Independent Test**: An employee without a publisher grant cannot change broadcasts. A client cannot reach employee Playground URLs or APIs.

---

### User Story 7 - Client portal and client administration (Priority: P2)
The client dashboard shows the active organisation, entitled offerings, approved demos, sessions, contribution status and visible ideas, with empty states (never another tenant's data). Entitled sandbox runs are isolated by tenant and user. Client admins invite and revoke members and grant approved client roles within their own organisation, and see membership and invitation states.

**Independent Test**: A client admin's attempt to grant the moderator role, or invite into Org B, is rejected server-side. A non-entitled product's sandbox returns 404.

---

### Edge Cases
- A user with zero memberships signs in, and gets a "no workspace" state rather than a public fallback.
- A resource is created without an audience, and the DB constraint rejects it.
- An invitation email's case or whitespace differs from the verified email, and the comparison is normalised.
- A moderator who is also a client member of Org A moderates Org A's item: allowed but flagged as a conflict of interest in the audit log.
- Withdrawal happens while a moderator has the item open, and their publish attempt fails with a state conflict.
- Theme filters narrow a cohort below N (a differencing attack), and the counts are suppressed.
- Search and AIRA queries are crafted to request another tenant's IDs, and the server ignores client-supplied tenant scope.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST evaluate `authorize(principal, action, resource)` server-side on every route, server action, API and media request, and enforce matching RLS policies (IAM-01).
- **FR-002**: The system MUST keep separate grants for publisher, moderator, inviter (client admin), role-changer (portal admin) and product owner, and deny by default (IAM-02).
- **FR-003**: Every resource MUST have a non-null audience from {public, employee, org:<id>, community_shared, author_only, grant:<name>}.
- **FR-004**: Auth MUST use email OTP/magic link. Employee status MUST require a verified `@azentio.com` email AND an approved employee membership.
- **FR-005**: Invitations MUST be single-use, expiring, stored hashed, and bound to the invited email and organisation. Acceptance MUST require the matching verified account.
- **FR-006**: The active workspace MUST be stored in the server session. Client-supplied tenant IDs MUST be ignored for authorization.
- **FR-007**: Contributions MUST start as private drafts and move only through the allowed-transition table. Each transition MUST write an audit event and an in-app notification.
- **FR-008**: The system MUST record the 4 consents separately, with timestamps and history.
- **FR-009**: Publishing MUST create a separate shared representation containing only moderator-reviewed fields, via a dedicated serializer.
- **FR-010**: Withdrawal MUST remove the shared representation from search, embeddings, themes and cache within the same request, and the production propagation SLA MUST be documented.
- **FR-011**: Search, counts, suggestions and exports MUST apply record-level visibility.
- **FR-012**: Theme statistics MUST show distinct-organisation counts only when ≥ N (config; 3 for judging) and suppress smaller cohorts.
- **FR-013**: Improvement ideas MUST have the fields and statuses listed in §10, with audited status history.
- **FR-014**: Notifications MUST be persisted with an outbox. The UI MUST show their true delivery state.
- **FR-015**: Protected media MUST be served only via an authorizing endpoint that issues short-lived signed URLs.
- **FR-016**: Public pages MUST reproduce the prototype's visual direction and routes. `/configurator`, `/playground` and `/live` MUST require authorization.
- **FR-017**: All Playground and sandbox data MUST be synthetic and labelled. Outputs MUST NOT be presented as decisions.
- **FR-018**: Privileged actions by portal admins on private client content MUST require an explicit support/moderation authorisation record.

### Key Entities
- **Organisation**, **User**, **Membership** (user ↔ org, status), **RoleGrant** (role, scope), **Invitation**, **Entitlement** (org ↔ product)
- **Content / MediaAsset / Broadcast** (audience-tagged)
- **Contribution** (private source) → **ContributionVersion** → **SharedRepresentation** (published copy), **Consent**, **ModerationEvent**, **Report**
- **Theme**, **ThemeEvidence**, **ImprovementIdea**, **IdeaStatusChange**
- **Notification**, **OutboxMessage**, **AuditEvent**, **PlaygroundRun**

## Success Criteria *(mandatory)*
- **SC-001**: Acceptance tests A1–A14 (PLAN.md §4) pass in CI.
- **SC-002**: 0 cross-tenant reads in the automated authz matrix (every persona × every protected resource × every action).
- **SC-003**: The withdrawn item is absent from search, themes and AIRA on the very next request (≤ 1 s in the judging environment).
- **SC-004**: The illustrative 3-organisation seasonal-SME scenario can be demonstrated end to end in under 5 minutes.
- **SC-005**: Public home page meets "good" Core Web Vitals thresholds in a Lighthouse lab run.

## Assumptions
- Entra ID is unavailable, so Supabase email OTP is the managed identity flow. A local email catcher (Supabase Inbucket/Mailpit) is used in development and for judging unless an email provider is supplied.
- Attachments are omitted in P0. Links are supported instead (allowed by §07).
- Email delivery, AIRA synthesis, comments/bookmarks/saved searches and semantic clustering are P1. Federated learning is P2.
- Content for the public pages is reused from the reference prototype, which the brief permits.
- Employee provisioning: the organiser-approved employee list is seeded by a portal admin.
