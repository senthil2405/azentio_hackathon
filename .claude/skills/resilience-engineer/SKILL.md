---
name: resilience-engineer
description: Audit and upgrade error handling — replace silent try/catch swallows with typed errors, real recovery logic, retry/backoff, structured logging, and user-facing messages that aren't "Something went wrong". Use when the user says "improve error handling", "add logging", "make this resilient", "why are we losing errors", "this should retry", "audit the error paths", or "we never see anything in Sentry from this service".
---

# resilience-engineer — when something fails, fail well

## When to use this skill

Trigger when error handling is the issue. Strong signals:

- "improve the error handling here"
- "add logging / observability"
- "make this more resilient"
- "this should retry on failure"
- "we're swallowing errors somewhere"
- "Sentry isn't getting anything from this service"

Do *not* trigger for: writing happy-path code that hasn't been written yet (just write it), or for incident response (you need a responder, not a refactor).

## The output contract

Error-handling changes that:

1. **Make failures observable** — every caught error reaches the logging/monitoring layer with enough context to debug from
2. **Distinguish recoverable from terminal** — transient failures retry with backoff; programmer errors crash loud
3. **Type the errors** — `throw new Error('foo')` becomes typed classes with structured fields
4. **Surface useful messages** — to the user, specific enough to act on; to the developer, specific enough to fix
5. **Don't hide bugs** — never `catch (e) {}` without rethrowing or logging

## Workflow

### 1 — Find the silent failures

```bash
# Empty catch blocks
rg 'catch\s*\([^)]*\)\s*\{?\s*\}'

# Catch that just returns
rg -A 2 'catch\s*\([^)]*\)\s*\{' | rg -B 1 'return( null| undefined| \[\])?;?$'

# Catch that just logs (no rethrow, no monitoring)
rg -A 3 'catch\s*\([^)]*\)\s*\{' | rg 'console\.(log|warn|error)'

# Promises with no .catch
rg '\.then\([^)]+\)(?!\s*\.catch)' -P

# async functions called without await (fire-and-forget without handler)
rg '^\s*[a-zA-Z_$][\w$]*\(' --no-heading
```

For each match, decide: real failure mode being swallowed? Or a false positive (e.g., `catch` that's part of a deliberate fallback strategy)?

### 2 — Map the error taxonomy

For the module under review, list every distinct kind of failure:

- **Transient external** — network blip, 503 from upstream, DB connection drop → retry
- **Permanent external** — 4xx from upstream, invalid API key → fail fast, surface
- **User input** — validation failed → 422 with clear message
- **Programmer error** — assertion failed, missing case in switch, impossible state → crash, alert
- **Business logic** — insufficient funds, expired token, rate-limited → expected, return error to user without alarming logs

For each kind, decide the *strategy* before touching code:

| Kind | Strategy | Surface |
|------|----------|---------|
| Transient external | Retry 3x w/ backoff, then surface | User: "Please try again" + retry button |
| Permanent external | Surface immediately | User: actionable message; logs: full context |
| User input | Reject at boundary | User: field-level error |
| Programmer error | Crash | Pager |
| Business logic | Return early | User: specific message |

### 3 — Introduce typed errors

Replace anonymous `Error` with a discriminated hierarchy:

```ts
// errors.ts
export abstract class AppError extends Error {
  abstract readonly kind: string
  abstract readonly httpStatus: number
  abstract readonly retryable: boolean
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message)
    this.name = this.constructor.name
  }
}

export class ValidationError extends AppError {
  readonly kind = 'validation'
  readonly httpStatus = 422
  readonly retryable = false
}

export class UpstreamUnavailableError extends AppError {
  readonly kind = 'upstream_unavailable'
  readonly httpStatus = 502
  readonly retryable = true
}

export class InsufficientFundsError extends AppError {
  readonly kind = 'insufficient_funds'
  readonly httpStatus = 402
  readonly retryable = false
}

export class NotFoundError extends AppError {
  readonly kind = 'not_found'
  readonly httpStatus = 404
  readonly retryable = false
}
```

Throw these instead of plain `Error('failed')`. The shape lets every layer downstream make the right call without parsing message strings.

### 4 — Add retry where it belongs

For transient failures only — retrying a 401 just wastes effort.

```ts
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { tries?: number; baseMs?: number; maxMs?: number } = {}
): Promise<T> {
  const { tries = 3, baseMs = 500, maxMs = 5000 } = opts
  let lastErr: unknown
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (err instanceof AppError && !err.retryable) throw err
      if (attempt === tries) throw err
      const delay = Math.min(maxMs, baseMs * 2 ** (attempt - 1)) + Math.random() * baseMs
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastErr
}
```

Rules:
- Cap the number of attempts (3 is a good default; 5 is the ceiling for user-blocking work)
- Always add jitter — otherwise N clients retry in lockstep and DDoS the upstream
- Respect `Retry-After` headers when present
- Don't retry on non-idempotent operations (POSTs that create resources) unless an `Idempotency-Key` is used

### 5 — Structured logging

Every caught error logs at the right level with structured fields:

```ts
logger.error('payment.charge_failed', {
  err: serializeError(err),       // ← message, stack, kind
  user_id: user.id,
  amount_cents: amount,
  payment_method: method.kind,
  request_id: req.id,
})
```

Rules:
- Use a structured logger (`pino`, `winston`, `structlog`) — not `console.log`. The fields need to be queryable.
- Always include `request_id` / `trace_id` so logs across services join up.
- Never log secrets, full credit card numbers, raw passwords, full session tokens.
- Use stable event names (`payment.charge_failed`, not `'failed to charge payment for user'`) — the words in the message will drift; the event name is the query handle.

### 6 — User-facing messages

Map each error kind to a sentence the user can act on:

```ts
function userMessageFor(err: AppError): string {
  switch (err.kind) {
    case 'validation': return err.message
    case 'insufficient_funds': return "Your card was declined for insufficient funds."
    case 'upstream_unavailable': return "We couldn't reach our payment processor. Please try again in a moment."
    case 'not_found': return "We couldn't find what you're looking for."
    default: return "Something went wrong on our end. We've been notified."
  }
}
```

Rules:
- Never expose stack traces or raw error messages to the user.
- Be specific where you can be ("Your card was declined" beats "Payment failed").
- Include the next step ("try again", "contact support", "check your details").
- Include a support reference ID for the catchall — so the user can give it to support and you can find the trace.

### 7 — Crash on impossible state

Programmer errors should fail loud and early. Use `assert` / invariant checks:

```ts
function processPayment(p: Payment) {
  if (p.status !== 'pending') {
    throw new Error(`processPayment called on payment in status ${p.status} (id=${p.id}) — this should be impossible`)
  }
  // ...
}
```

These should reach the pager. The whole point is that they're *impossible*, so when they happen, you want to find out immediately.

### 8 — Verify

- Trigger each error path manually or in tests. Confirm it shows up in logs with the expected event name and fields.
- Confirm the user-facing message renders correctly.
- For retries: confirm the retry happens, the backoff is bounded, and the final failure surfaces.

## Patterns and anti-patterns

✅ **Do**:
- Treat `unknown` errors as the default in catch (TS 4.4+). Narrow before using.
- Cause-chain errors: `throw new UpstreamError('Stripe failed', { cause: err })`. Preserves the original stack.
- Have *one* error → HTTP mapping layer. Don't translate errors in every controller.
- Treat error rate as an SLI. Alert on rate change, not on every individual error.

❌ **Don't**:
- Don't `catch (e) { throw e }` — pointless. Remove the try.
- Don't return `null` from a function that could fail in multiple ways. Throw or return a Result type.
- Don't retry forever. There's no `5xx` that becomes a `200` on the 17th attempt.
- Don't log and rethrow the same error. The next layer will log it too — you get double-entry noise.
- Don't catch `Error` broadly when you only meant to handle a specific subtype. You'll swallow real bugs.

## Example invocation

> User: "Audit error handling in `src/payments/` — Sentry has almost nothing from this module."

1. Find silent failures: 11 empty catches, 6 catches that just `return null`, 4 `.then()` without `.catch()`.
2. Map taxonomy: provider 5xx (transient, retryable), provider 4xx (permanent, surface), card declined (business logic, return to user), webhook signature invalid (security, log + 401).
3. Introduce `PaymentError` hierarchy with subclasses for each.
4. Wrap provider calls with `withRetry` for transients; surface the rest immediately.
5. Replace `console.log` + ignore with `logger.error('payment.<event>', { ... })` with `request_id`, `user_id`, `amount_cents`.
6. Map errors → user messages in the controller layer. "Card declined" gets the real reason from the provider; everything else gets a generic + reference ID.
7. Add invariant: `processCharge` throws if called on a charge not in `pending` state.
8. Verify: simulate each path locally; confirm Sentry receives the right events with the right fields; confirm the retry happens on a forced 502.
9. Report: 21 silent failure sites closed, 5 typed error classes added, retries wired for 3 upstream call sites, Sentry now receives 4 named event types from this module.

## See also

- `code-auditor` — finds silent error sites at scale across the codebase
- `perf-hunter` — when "errors" are actually timeouts caused by slowness
- `ship-it` — to wire the alert routing on the new structured events
