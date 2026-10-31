# STRIDE prompt bank — React + Node.js edition

Use this as a checklist during the STRIDE walk (step 5 of the SKILL.md). For each asset / entry point, ask the relevant questions and write the threat down even if you think the answer is "no" — the doc's job is to *prove* coverage, not just claim it.

The prompts are tuned for the typical web stack: Express / Fastify / Next.js / NestJS on the server, React / Vue on the client, Postgres / Mongo / Redis, JWT or session cookies, third-party auth (Auth0 / Clerk / NextAuth), Stripe / SendGrid / Twilio integrations.

---

## S — Spoofing (someone pretends to be someone they aren't)

**Auth tokens**
- JWT `alg` validated against an allowlist (not `auto` / not `none`)?
- `kid` validated against a key allowlist?
- Token expiry actually checked, not just signed?
- Refresh-token rotation enforced; reuse detected and revokes the family?
- Session cookies marked `HttpOnly`, `Secure`, `SameSite=Strict` (or `Lax` with explicit reasoning)?
- Password compare uses `argon2` / `bcrypt` (≥cost 12), not `===`?
- Password-reset tokens compared with `crypto.timingSafeEqual`?

**OAuth flows**
- State parameter validated to prevent CSRF on the callback?
- PKCE used for any public client?
- Redirect URI matched against allowlist (exact, not prefix)?
- Scopes requested are the minimum needed?

**Third-party identity**
- If using Auth0/Clerk/NextAuth — is the JWT verified on the server, not just decoded?
- Are `iss` and `aud` claims checked?

---

## T — Tampering (someone modifies data they shouldn't)

**HTTP body / query / params**
- Zod / Yup / Valibot validation at the boundary, not deep inside?
- Mass-assignment blocked? `User.update(req.body)` with `is_admin` in the body is the classic.
- File uploads: content-type *verified*, not trusted from the client header?
- Path traversal: `path.resolve(BASE, userInput)` checked with `startsWith(BASE)`?

**Database writes**
- Every write checks the actor's authority over the row (`WHERE id = ? AND user_id = ?`)?
- ORM `.update()` calls have a constrained `where` — not `.update({}, { where: { id } })` where `id` is user-controlled?
- Mongo: user-controlled keys can't become operators (`{ $ne: null }` injection)?

**React client**
- Client-side validation is duplicated server-side? (Yes? Then it's defense-in-depth. No? Then it's theatre.)
- Optimistic updates can't write fields the server would reject?

**Webhook payloads**
- Stripe: `stripe.webhooks.constructEvent(body, sig, secret)` with raw body?
- SendGrid / Twilio / GitHub: signature verified with `crypto.timingSafeEqual`?
- Replay protection: timestamp checked + tolerance bounded?

---

## R — Repudiation (someone denies an action they took)

- Audit log on every state-changing action? (role changes, payments, deletions, exports)
- Logs include `actor_id`, `request_id`, `timestamp`, `ip` (where appropriate), `action`, `target_id`?
- Logs go to an append-only sink (not just stdout — they need to survive)?
- Are logs themselves tamper-evident (signed, hashed-chain, or write-once storage)?
- For background jobs: does the log identify the *triggering* actor, not just "worker_3"?

---

## I — Information disclosure (someone reads data they shouldn't)

**IDOR (the #1 web bug)**
- Every `GET /resources/:id` checks ownership *of the resource*, not just "is logged in"?
- Sequential IDs avoided in public URLs? (Use ULID, UUID, or prefixed IDs like `inv_abc123`)
- "Mine" queries (`/api/orders/mine`) use the authenticated user from session, not from a query param?

**Verbose errors**
- Production builds strip stack traces from responses?
- 404 vs 403 doesn't leak existence (a user shouldn't be able to tell "this ID exists but I can't see it" vs "this ID doesn't exist")?
- Auth errors: same response for "user not found" vs "wrong password"?

**Client-side leakage**
- React: server-only data NOT bundled into `__NEXT_DATA__` / `getServerSideProps` payloads?
- API responses trimmed to what the client needs (no `password_hash`, no `internal_notes`)?
- Browser network tab — does any response contain fields the UI never shows?

**Side channels**
- Login response time differs between "user exists" and "user doesn't"? (Timing oracle)
- "Email already taken" on signup tells attacker who's registered?

**File serving**
- User-uploaded files served from a different origin (so they can't execute as same-origin scripts)?
- Content-Type forced on response (not sniffed from upload)?
- `X-Content-Type-Options: nosniff` header?

---

## D — Denial of Service

**Rate limits**
- Every public endpoint has a rate limit? (`/login`, `/signup`, `/reset-password`, `/by-token/:t` for invitation-style)
- Authenticated endpoints rate-limited per-user (not just per-IP)?
- Expensive endpoints (search, export, image-processing) limited more aggressively?

**Unbounded work**
- Pagination required, with a sensible `limit` cap (≤ 100)?
- `req.body` size limit set on Express/Fastify? Default is generous; should be tight.
- Regex on user input bounded (catastrophic backtracking)?
- File uploads have size + count caps?

**Resource exhaustion**
- `Promise.all` over unbounded user input — capped with `p-limit`?
- DB connection pool sized; no per-request connection allocation?
- React: a single bad API response shouldn't render 10,000 DOM nodes (virtualize lists)

**Async traps**
- `JSON.parse` on huge user-supplied bodies happens off the event loop (worker thread)?
- Crypto / hashing on hot paths is async / off-thread?

---

## E — Elevation of privilege (lower-privilege actor becomes higher)

**Role checks**
- Every admin route guarded by an `isAdmin` (or role) middleware, not just "is logged in"?
- Role check happens server-side, not client-side?
- Role stored in the JWT / session — and refreshed when the user's role changes?
- A user who's been demoted has their existing sessions invalidated?

**Multi-tenancy**
- Every query includes `tenant_id` from the session, *not* from the request?
- Cross-tenant resource references (e.g., "share this with org X") explicitly validated?
- Row-level security in Postgres if the layer supports it?

**Privilege boundaries inside the app**
- Free vs paid feature gates checked server-side, not just hidden in the UI?
- "Soft" admin operations (impersonation, support-mode) gated and audit-logged?

---

## Extras STRIDE doesn't naturally surface (don't skip)

**SSRF — Server-Side Request Forgery**
- Any code that fetches a user-supplied URL? Validate the URL doesn't resolve to private IP space (10.0.0.0/8, 127.0.0.1, 169.254.169.254 — AWS metadata, IPv6 equivalents).
- The check happens *after* DNS resolution, not just on the string. Use `dns.lookup` and check the resolved IP.
- Common offenders: webhook test endpoints, URL preview generators, image proxies, SSO callbacks.

**Deserialization**
- `JSON.parse` on untrusted input is safe (it's not deserialization in the dangerous sense)
- But: `node-serialize`, `js-yaml.load` (vs `safeLoad`), `eval`, `Function()`, dynamic `require` — those are RCE if user-controlled.

**Prototype pollution**
- `_.merge(target, untrustedJson)` with lodash < 4.17.21 → prototype pollution.
- `Object.assign(target, JSON.parse(body))` with a body containing `__proto__` or `constructor.prototype`?
- Use `Map` instead of `Object` for user-keyed dictionaries.

**Subdomain takeover**
- Any DNS records pointing at a third-party service the team no longer uses (Heroku app shut down, S3 bucket deleted)?

**OAuth scope creep**
- Does the app request the minimum scopes? "user:read" is fine. "repo,admin:org,write:packages" because "we might need them someday" is a footgun.

**Race conditions on state machines**
- Double-clicking "Confirm payment" charges twice?
- Coupon code can be redeemed twice via parallel requests?
- Invitation accepted twice creates two memberships?
- Fix: use a DB-level uniqueness constraint or `SELECT ... FOR UPDATE`, not application-level locking.

**CORS gotchas**
- `Access-Control-Allow-Origin: *` paired with `Access-Control-Allow-Credentials: true` → broken (browsers ignore credentials when origin is `*`, but the bug pattern keeps showing up).
- Allow-list reflected without validation — an attacker sets `Origin: evil.com` and your server echoes it back.

**Next.js specific**
- `getServerSideProps` returns leak server-only data into the page bundle?
- Server actions: authenticated? Authorized for the specific resource?
- Middleware (`middleware.ts`) — does it actually run on all the routes you think it does? Test the matcher.

---

## How to use this in the walk

For each entry point in your model, scan this doc and write down:
- The threats that apply, with severity score
- The threats that don't apply, with one-line "N/A: <reason>" — explicit non-coverage is more useful than silent skipping
- The threats you can't evaluate yet, with an owner in the open-questions list
