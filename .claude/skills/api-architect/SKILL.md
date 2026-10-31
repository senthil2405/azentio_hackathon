---
name: api-architect
description: Design HTTP APIs (REST or GraphQL) from a requirements document — endpoints, resource names, request/response shapes, auth model, pagination, errors, versioning. Produces an OpenAPI 3.1 spec for REST or a typed SDL for GraphQL, plus a one-page design rationale. Use when the user says "design an API for", "plan the endpoints", "give me the API schema for", "REST or GraphQL for this?", or hands over a feature spec and asks for the API surface.
---

# api-architect — design the contract before writing the handler

## When to use this skill

Trigger when the user needs an API design before implementation. Strong signals:

- "design an API for <feature>"
- "what should the endpoints look like?"
- "REST or GraphQL for this use case?"
- "give me an OpenAPI spec for X"
- A feature spec or PRD pasted with no endpoint plan

Do *not* trigger for: small additions to an existing API (just add the endpoint, matching local conventions), pure data modeling (use `schema-architect`), or when wrapping an existing API (use `mcp-forge`).

## The output contract

A design artifact that includes:

1. **A short rationale** — 1 page. Why REST vs GraphQL, what trade-offs were made, what was deliberately left out.
2. **The schema** — OpenAPI 3.1 YAML for REST, or a GraphQL SDL with typed resolvers planned.
3. **Resource model** — what the nouns are, what the verbs are, what the relationships are.
4. **The boring-but-critical parts** — auth, pagination, filtering, errors, versioning. All explicit, all consistent.
5. **A "what's NOT in v1" section** — so reviewers don't argue about features that were intentionally deferred.

## Workflow

### 1 — Read the requirement, find the resources

From the spec, list:
- **Nouns**: the things users will create, read, update, delete (`Order`, `Customer`, `Invitation`)
- **Verbs**: the actions that don't fit CRUD (`/orders/{id}/cancel`, `/invitations/{token}/accept`)
- **Queries**: how users will find lists (`my open orders`, `customers signed up this week`)
- **Side effects**: who needs to be notified, what gets emailed, what gets logged

This list is the design surface. Everything below it is a choice you make about that surface.

### 2 — REST or GraphQL?

Don't default. Choose deliberately:

**Choose REST when**:
- Consumers are diverse (browser, mobile, third-party integrations)
- The data shape is mostly resource-oriented and predictable
- You want HTTP caching, CDNs, easy debugging in the browser network tab
- Operations are uniform CRUD on clear resources

**Choose GraphQL when**:
- One client (typically a complex SPA) fetches deeply nested, varied shapes
- Over-fetching is a real perf problem and you've measured it
- The team can absorb the operational complexity: resolver perf, N+1 protection, query depth limits, persisted queries

Write the choice + 2 reasons in the rationale. If you can't articulate it, default to REST.

### 3 — Design resources

For REST:

- URLs are nouns, plural, kebab-case: `/customers`, `/api/v1/invoice-line-items`
- HTTP verbs do the work: `GET /orders`, `POST /orders`, `GET /orders/{id}`, `PATCH /orders/{id}`, `DELETE /orders/{id}`
- Sub-resources for clear ownership: `GET /orders/{id}/line-items` (when line items have no independent existence)
- Actions that don't fit CRUD become POSTs to a sub-route: `POST /orders/{id}/cancel`, `POST /invitations/{token}/accept`
- IDs are stable, opaque, never sequential integers in public APIs (use ULIDs, UUIDs, or prefixed IDs like `cus_abc123`)

For GraphQL:

- One `Query` root for reads, one `Mutation` root for writes
- Nodes implement a `Node` interface with a global ID
- Connections for pagination follow Relay spec (`edges`, `node`, `pageInfo`)
- Mutations take a single input object: `signUp(input: SignUpInput!): SignUpPayload!`

### 4 — Auth model

Decide once. Stick to it.

- **Bearer tokens** (JWT or opaque): `Authorization: Bearer <token>` on every request
- **API keys**: header (`X-API-Key`) not query string
- **OAuth 2.0**: spec the scopes per endpoint
- **Cookie sessions**: only for first-party browser clients

Document:
- Which endpoints are public
- Which require auth and what scopes/roles
- What 401 vs 403 means in this API

### 5 — The boring-but-critical layer

Specify these once, apply everywhere:

**Pagination** (cursor, not offset, for anything that might grow):
```
GET /orders?cursor=<opaque>&limit=50
→ { data: [...], next_cursor: '...', has_more: true }
```

**Filtering**: explicit query params (`?status=open&customer_id=cus_123`), not a generic `filter=` blob.

**Sorting**: `?sort=created_at` or `?sort=-created_at` (leading `-` for desc).

**Errors**: pick a format and use it everywhere. RFC 7807 (`application/problem+json`) is the safest default:
```json
{ "type": "/errors/insufficient-funds", "title": "Insufficient funds", "status": 402, "detail": "Account balance is $4.50, charge was $10.00", "instance": "/orders/ord_123" }
```

**Versioning**: URL path for major (`/api/v1/`, `/api/v2/`). Deprecation headers for warnings. Never minor-version a URL.

**Idempotency** for unsafe operations: accept `Idempotency-Key: <uuid>` header on POSTs that create resources or move money.

**Rate limits**: return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers and 429 with `Retry-After`.

### 6 — Produce the spec

For REST: a complete OpenAPI 3.1 YAML, validated with `redocly lint` or `swagger-cli validate`. Every endpoint has request schema, response schemas (including the error envelope), and example.

For GraphQL: a complete SDL file. Every type, every field, every input. Use `@deprecated(reason: ...)` rather than removing fields.

### 7 — Write the rationale

One page, plain prose. Cover:
- Why REST or GraphQL
- The auth choice + reasoning
- The pagination/error choices + reasoning
- What's explicitly out of scope for v1
- The biggest trade-off you made and what would change the call

## Patterns and anti-patterns

✅ **Do**:
- Make 201 responses return the created resource (or at least its ID + canonical URL).
- Use 422 for validation errors, 400 only for malformed requests.
- Make `DELETE` idempotent — second call returns 204 or 404, not 500.
- Return ISO 8601 timestamps in UTC, always. Never Unix timestamps in public APIs.
- Treat the spec as the source of truth; generate clients and types from it.

❌ **Don't**:
- Don't expose database column names as field names. The DB schema is yours to change; the API is a contract.
- Don't paginate with `?page=N&pageSize=M` for anything write-heavy — race conditions skip items.
- Don't reuse HTTP status codes ambiguously. 404 means "no resource"; don't also use it for "you don't have permission to see this resource" (that's 403, possibly disguised as 404 for security).
- Don't put auth tokens in URLs. Logs, browser history, referrers all leak them.
- Don't add a `success: true` envelope. HTTP status is the envelope.

## Example invocation

> User: "Design the API for an invitation system. Inviter creates invitations; invitee accepts via email link."

1. Read spec, list resources: `Invitation` (id, inviter_id, email, role, token, status, expires_at).
2. Verbs: create invitation, list my invitations, revoke invitation, accept invitation (one-time, by token).
3. Choose REST (multiple clients: web + email links + integration partners).
4. Rationale: REST chosen for HTTP-caching the public accept page and simple email link semantics. Auth: bearer JWT for inviter routes, public + token for accept.
5. Endpoints:
   - `POST /api/v1/invitations` (auth required) → 201 + invitation
   - `GET /api/v1/invitations?status=pending` (auth required) → paginated list
   - `DELETE /api/v1/invitations/{id}` (auth required) → 204
   - `GET /api/v1/invitations/by-token/{token}` (public, rate-limited) → invitation preview
   - `POST /api/v1/invitations/by-token/{token}/accept` (public, requires registered user) → 200 + membership
6. Errors: RFC 7807 envelope. Pagination: cursor-based. Idempotency: `Idempotency-Key` on POST /invitations.
7. Out of v1: bulk invite, custom roles per invitation, branded email customization.
8. Output: OpenAPI YAML + 1-page rationale in `docs/api-invitations.md`.

## See also

- `schema-architect` — translates the resource model into the DB schema
- `mcp-forge` — wraps the finished API as a Claude-callable surface
- `doc-craft` — turns the spec into developer-facing API docs
