---
name: security-sentinel
description: Sweep a codebase or diff for the OWASP Top 10 plus the practical adjacent issues (committed secrets, prototype pollution, SSRF, IDOR, deserialization, broken auth flows). Outputs findings with severity, exploit sketch, and the smallest fix. Use when the user says "security audit", "check for vulnerabilities", "is this safe to ship", "do a security review", "find security issues", or before a release that touches auth, payments, or PII.
---

# security-sentinel — find what an attacker would find first

## When to use this skill

Trigger when the user wants a security pass. Strong signals:

- "security audit", "security review", "is this safe?"
- "check for vulnerabilities", "scan for secrets"
- Before any release touching auth, payments, file uploads, PII
- "we're going through a SOC 2 review"

Do *not* trigger for: penetration testing of third-party systems without authorization, weaponizing exploits, or for incident response (that needs an actual responder, not a code review).

## The output contract

A security report with:

1. **Severity-ranked findings** — `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO` — each tied to real impact (CVSS-style reasoning, not a guess)
2. **An exploit sketch** for each finding — how an attacker would actually trigger it (1–3 sentences)
3. **The smallest fix** — the minimum diff that closes the issue
4. **A "no findings" verdict** when honest — don't fabricate to look thorough
5. **What was NOT checked** — be explicit about scope so the user doesn't think this was a full pen test

## Workflow

### 1 — Scope

Ask:
- Diff review or full codebase?
- Are there areas off-limits or low-priority (e.g., internal admin tools)?
- Is there a threat model to match against (e.g., "we care about tenant isolation more than DDoS")?

State the scope in the report. "Reviewed `src/api/`, did not review `infrastructure/`."

### 2 — Mechanical scan first

Run the cheap, automated wins before reading code:

- **Secrets**: `gitleaks detect --no-banner` or `trufflehog filesystem .` — anything found is treated as **leaked**, even if it's "just dev". Rotate immediately.
- **Dependencies**: `npm audit --omit=dev`, `pnpm audit`, `pip-audit`, `cargo audit`, `bundler-audit`, `govulncheck`. Note the criticals + highs.
- **Static analysis**: if `semgrep` / `bandit` / `gosec` / `brakeman` is in the toolchain, run it. Triage the results — most SAST output is noise; the real findings are gold.

### 3 — Walk the OWASP Top 10 systematically

For each, look at the actual code:

**A01: Broken Access Control**
- Every authenticated endpoint must check ownership *for the resource being accessed*. Find places like `getOrder(req.params.id)` without checking that the order belongs to the user. This is IDOR — the #1 web bug.
- Check for "horizontal" privilege escalation (one user accessing another's data) and "vertical" (regular user hitting admin endpoints).

**A02: Cryptographic Failures**
- Are passwords hashed with `argon2id` or `bcrypt` (cost ≥ 12)? Not MD5, SHA-1, or plain SHA-256.
- Are tokens compared with `crypto.timingSafeEqual`? Not `===`.
- Is TLS terminated correctly? `Strict-Transport-Security` header set?
- Are session cookies `HttpOnly`, `Secure`, `SameSite=Strict` (or `Lax` with explicit reasoning)?

**A03: Injection**
- SQL: every query that interpolates user data — is it parameterized? Look for template strings, string concat, or ORM raw queries.
- Command: any `child_process.exec(`...${input}...`)` is broken. Use `execFile` with an args array.
- Path traversal: `fs.readFile(path.join(BASE, req.params.file))` is vulnerable. Resolve and check `startsWith(BASE)`.
- NoSQL: Mongo query with user-controlled keys (`{ user: req.body.user }` where body could be `{ $ne: null }`).
- LDAP, XPath, log injection, template injection (Handlebars, Jinja2 with autoescape off).

**A04: Insecure Design**
- Auth flows: rate limits on login, password reset, signup? Account enumeration in error messages?
- Password reset tokens: short-lived, single-use, tied to the user, sent via the verified channel only?
- 2FA: backup codes one-time, rate-limited verification?

**A05: Security Misconfiguration**
- CORS: is `Access-Control-Allow-Origin: *` paired with credentials? (That's a bug.)
- Express/Fastify default headers (X-Powered-By, etc.) removed?
- `app.use(express.json({ limit: '...' }))` set? Otherwise it's a DoS vector.
- Error pages leak stack traces in prod?
- Default credentials anywhere (`admin/admin`)?

**A06: Vulnerable Components**
- The audit results from step 2. Anything CRITICAL/HIGH gets ticketed.
- Are dependencies pinned? Floating `^1.0.0` ranges let a future minor break security guarantees.

**A07: Identification & Authentication**
- Session fixation? Session ID rotates on login?
- JWT: `alg: none` rejected explicitly? `kid` validated against an allowlist? Algorithm pinned (not "auto")?
- Multi-tenancy: org_id baked into every query, or relied on at the app layer (fragile)?

**A08: Software & Data Integrity**
- `package.json` lockfile committed?
- Container base images pinned to a digest, not just a tag?
- CI uses `actions/checkout@v4` or similar, not `@main`?
- Webhooks: signatures verified with `crypto.timingSafeEqual`?

**A09: Logging & Monitoring**
- Auth failures logged with rate (not just per event)?
- PII *not* in logs (passwords, tokens, full PANs, SSNs)?
- Errors surfaced to a monitoring system, not just stdout?

**A10: Server-Side Request Forgery (SSRF)**
- Any code that fetches a user-supplied URL? Must validate the URL doesn't resolve to private IP space (`10.0.0.0/8`, `127.0.0.1`, `169.254.169.254`, IPv6 equivalents).
- The check happens after DNS resolution, not just on the string.

### 4 — Adjacent classics worth a sweep

- **Prototype pollution** (JS): any `_.merge`, `Object.assign` over user-controlled JSON? Lodash < 4.17.21 is famous for this.
- **Deserialization**: `pickle.loads`, `Marshal.load`, `yaml.load` (vs `yaml.safe_load`), `unserialize` (PHP) on untrusted input → RCE.
- **XSS**: every `dangerouslySetInnerHTML`, `v-html`, `innerHTML =`, `document.write` — what's the source?
- **Open redirect**: `res.redirect(req.query.next)` without allowlist.
- **Race conditions**: TOCTOU on file ops, double-charge on payment retries, double-redemption of coupon codes.
- **Mass assignment**: `User.update(req.body)` allowing `is_admin: true` to slip through. Use explicit allowlists.

### 5 — Write the report

For each finding:

```
[SEVERITY] <title>
  File:        src/api/orders.ts:42
  Category:    OWASP A01 — Broken Access Control (IDOR)
  Impact:      Any authenticated user can read any order by guessing its ID.
  Exploit:     curl -H 'Authorization: Bearer <user A's token>' /api/orders/<user B's order ID>
  Fix:         Add `where userId = req.user.id` to the query, OR call a shared `assertOrgAccess(req.user, order.orgId)` before returning.
  References:  https://owasp.org/Top10/A01_2021-Broken_Access_Control/
```

End with:

- **Scope reviewed** — paths covered
- **Scope NOT reviewed** — paths skipped + why
- **Open dependency vulns** — count + criticals
- **Verdict** — one of: "Safe to ship; no findings above MEDIUM" / "Block release; <N> CRITICALs to address" / "Ship with mitigations: <list>"

## Patterns and anti-patterns

✅ **Do**:
- Trace user input from entry to sink. The bug is usually in the join.
- Treat any committed secret as compromised. Rotate first, dig into git history second.
- Default-deny for new endpoints. Auth + authz checks should be a middleware, not optional per route.
- For multi-tenant apps, enforce `org_id` filtering in the data layer, not the app layer — easier to audit, harder to forget.

❌ **Don't**:
- Don't recommend a WAF as a substitute for fixing the underlying bug.
- Don't trust client-side validation. Ever. The browser is hostile.
- Don't write your own crypto. Use the language's standard library; pick `libsodium` / `crypto` / `ring` over hand-rolling.
- Don't blocklist for input validation when an allowlist works. Blocklists always miss a case.
- Don't fix the symptom (sanitize this string) when you can fix the cause (use a parameterized query).

## Example invocation

> User: "Run a security audit on the auth module before we launch."

1. Scope: `src/auth/`, including the routes and middleware. Not reviewing infrastructure or third-party SaaS configs.
2. Mechanical: `gitleaks` clean; `npm audit` shows 1 HIGH (jsonwebtoken < 9.0.0, signature bypass) — already on 9.0.2, false positive in transitive, but pinning needs to be confirmed.
3. Walk OWASP:
   - **CRITICAL** `auth/reset.ts:42` — token compared with `===`. Timing attack. Use `crypto.timingSafeEqual`.
   - **HIGH** `auth/login.ts:23` — no rate limit. Brute force feasible. Wrap with existing `rateLimit('auth.login', { max: 5, window: '15m' })`.
   - **HIGH** `auth/signup.ts:88` — different response between "email exists" and "email created" enables enumeration. Return the same 202 in both cases; send the differentiator via email.
   - **MEDIUM** `auth/session.ts:55` — session cookie missing `SameSite`. Add `SameSite=Strict`.
   - **LOW** `auth/utils.ts:14` — password complexity check is hard-coded; move to config.
4. Open vulns: 0 critical, 0 high after pinning verification.
5. Verdict: Block release — fix the timing-safe compare and rate limit before launch. Others can be a follow-up PR within the week.

## See also

- `code-auditor` — broader code-quality review that includes some of these findings
- `mcp-forge` — sweep newly-generated MCP servers for the auth/secrets pitfalls
- `ship-it` — set up the protected-branch and required-checks rules in CI
