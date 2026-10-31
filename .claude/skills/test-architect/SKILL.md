---
name: test-architect
description: Write unit and integration tests that actually catch bugs — real assertions, real edge cases, real failure modes. Detects the project's framework (Jest, Vitest, Mocha, pytest, Go test) and matches existing conventions. Use when the user says "write tests for", "cover this with tests", "add unit tests", "I need tests for this function", or hands over an untested module. Refuses to write placeholder `expect(true).toBe(true)` tests.
---

# test-architect — tests that would catch the bug

## When to use this skill

Trigger when the user wants tests for specific code. Strong signals:

- "write tests for `<file or function>`"
- "cover this with tests"
- "add unit tests"
- "I need tests for this"
- A function pasted with no further context

Do *not* trigger for: e2e/browser flows (use `browser-qa`), test infrastructure setup, or when the user only wants you to fix a failing test (just fix it).

## The output contract

Tests that:

1. **Run** — `npm test`, `pytest`, `go test`, etc., all green on the new file.
2. **Match the codebase** — same framework, same test file location, same naming convention as the existing tests.
3. **Cover the contract**, not the implementation — happy path, failure modes, boundary values, empty/null inputs.
4. **Fail when behavior breaks** — every assertion would detect a real regression, not just confirm the code ran.
5. **Are independent** — no test depends on the order or state of another.

## Workflow

### 1 — Detect the test stack

Inspect the repo first:

- Which framework? Look at `package.json` (`jest`, `vitest`, `mocha`), `pyproject.toml` / `pytest.ini`, `go.mod`, `Cargo.toml`.
- Where do tests live? `__tests__/`, `test/`, `*.test.ts` next to source, `*_test.go`?
- What conventions? `describe/it` vs `test()`, AAA vs given/when/then, fixture style, mocking library.

Match what's there. Don't introduce a new framework just because you prefer it.

### 2 — Read the function like an adversary

Before writing assertions, list the failure modes you can think of:

For a function with this signature:
```ts
function parseDuration(input: string): number  // returns ms
```
list:
- `"30s"` → 30000
- `"5m"` → 300000
- `"1h"` → 3600000
- `""` → throws? returns NaN? returns 0?
- `"abc"` → throws?
- `"5"` → no unit — throws or assumes ms?
- `"5x"` → unknown unit — throws?
- `"-5s"` → negative — allowed?
- `null`, `undefined` → TypeScript prevents at compile, but runtime?
- Float input: `"1.5s"` → 1500?

That list *is* the test plan. Now write one test per item.

### 3 — Structure the test file

For each function under test, group:

```ts
describe('parseDuration', () => {
  describe('happy path', () => { ... })
  describe('boundary values', () => { ... })
  describe('invalid input', () => { ... })
})
```

Name tests with the input → output, not the implementation:

✅ `'parses "30s" as 30000'`
✅ `'throws on empty string'`
❌ `'works'` ❌ `'returns the result'` ❌ `'test 1'`

### 4 — Write real assertions

Each test asserts a *specific* observable. Never:

```ts
expect(result).toBeTruthy()      // ❌ what does truthy mean?
expect(result).toBeDefined()     // ❌ a string '' is defined too
expect(true).toBe(true)          // ❌ this is not a test
```

Always:

```ts
expect(result).toBe(30000)
expect(result).toEqual({ id: 1, name: 'Ada' })
expect(() => parseDuration('')).toThrow(/empty/)
expect(result.items).toHaveLength(3)
```

For async: `await expect(promise).rejects.toThrow(SpecificError)`.

### 5 — Stub at the right layer

- **Pure functions**: no mocks needed.
- **Functions that call other modules**: stub at the import boundary, not deep inside.
- **HTTP**: use `msw` (browser/node), `nock`, or `responses` (Python). Don't stub `fetch` globally — that breaks other tests.
- **DB**: prefer an in-memory or test-container instance over mocking the ORM. Mocks of complex ORMs lie.
- **Time**: use the framework's fake timers; never `await new Promise(r => setTimeout(r, ...))` in tests.

### 6 — Run, then expand

Run the file. If green, add coverage for one more failure mode you initially skipped. If red, the test caught a real bug — flag it to the user before "fixing" the test.

## Patterns and anti-patterns

✅ **Do**:
- One concept per test. If you need `&&` in the name, split it.
- Use table-driven tests for many similar cases:
  ```ts
  test.each([
    ['30s', 30000], ['5m', 300000], ['1h', 3600000],
  ])('parses %s as %i', (input, expected) => {
    expect(parseDuration(input)).toBe(expected)
  })
  ```
- Test error messages too — they're part of the contract for humans.
- Keep test setup local to the test or the `describe` block. Avoid module-level mutation.

❌ **Don't**:
- Don't test private methods directly. Test the public contract.
- Don't share state between tests. Reset before each.
- Don't test the framework. `expect(typeof fn).toBe('function')` adds nothing.
- Don't snapshot-test arbitrarily. Snapshots are for stable serialized output; otherwise they just rubber-stamp regressions.

## Example invocation

> User: "Write tests for `src/utils/slugify.ts`." (file exports `slugify(s: string, options?: { maxLen?: number }): string`)

1. Detect: Vitest, `__tests__/` adjacent.
2. List failure modes: empty string, all spaces, unicode (`"café"` → `"cafe"`?), trailing dashes, very long input (`maxLen` kicks in), already-slugified input (idempotent?), multi-byte emoji.
3. Write `__tests__/slugify.test.ts` with three describes: happy path (8 cases), boundary (4 cases), invalid (2 cases).
4. Add table-driven test for unicode normalization.
5. Run: `npm test slugify` — 14/14 green.
6. Spot during writing: `slugify("   ")` returns `"-"`, which the user probably didn't intend. Flag it; ask whether to write the test for current behavior or the expected behavior.

## See also

- `code-auditor` — to find the untested edge cases before you start writing
- `browser-qa` — when the behavior under test is a user flow, not a function
- `refactor-master` — if you need to refactor to make the code testable
