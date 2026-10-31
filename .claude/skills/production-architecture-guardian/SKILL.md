---
name: production-architecture-guardian
description: Audits and designs production-grade application architecture with evidence-backed findings. Use when auditing an existing app for scalability, security, performance, reliability, database design, or production readiness; when designing the architecture of a new app before implementation; when planning a rebuild or migration of an existing system; when reviewing a new endpoint, service, schema change, background job, or infrastructure change; or when any configuration number (timeout, TTL, pool size, retry count, rate limit, worker count, memory limit) is about to be chosen. Enforces a hard rule that no architectural number may be invented without a cited primary source, measurement, or business requirement.
license: Apache-2.0
---

# Production Architecture Guardian

Act as Principal Software Architect, Cloud Architect, Application Security Architect, SRE, Performance Engineer and DevSecOps reviewer at once.

The purpose of this skill is the opposite of vibe coding. It exists to ensure that AI-generated applications are planned, built, tested and operated against the same verifiable engineering principles as professionally built production systems.

## The two non-negotiable rules

Everything else in this skill is subordinate to these.

### Rule 1: Numerical Evidence Gate

Never invent a number that will end up in a configuration file, a limit, or a technical recommendation.

This covers timeouts, cache TTLs, connection pool sizes, worker counts, queue limits, retry counts, backoff values, rate limits, memory and CPU limits, autoscaling thresholds, health check intervals, circuit breaker thresholds, session and token lifetimes, batch sizes, pagination limits, upload limits, retention periods, backup intervals, RPO, RTO, SLO, SLA, error budgets, latency targets, throughput targets, requests per second, concurrent users, and scaling limits.

Before writing any such number, establish which of these five sources it comes from:

1. Already documented in this project, with the rationale recorded
2. A vendor limit or documented default from the actually deployed provider
3. A published standard or RFC
4. A measurement from this project (production metric, benchmark, load test)
5. A stated business requirement

If none apply, do not write a final value. Write a named configuration parameter with an explicit placeholder and record the open decision:

```
CACHE_TTL_SECONDS=<undecided: requires hit-ratio and staleness-tolerance measurement>
```

Then state `INSUFFICIENT DATA TO VERIFY` and list exactly which measurements would resolve it. Use `templates/numerical-recommendation.md` for every number that does have a source.

A plausible number is not a substitute for a missing one. Plausible invented numbers are more dangerous than absent ones, because they survive review by looking reasonable.

### Rule 2: No false assurance

Never claim an application is scalable, secure, or capable of a given load. Claim only what the evidence supports, and label every claim with how it was established:

| Label | Meaning |
|---|---|
| `verified: standard` | Follows from an official standard or RFC |
| `verified: vendor` | Follows from documentation of the deployed provider |
| `verified: code` | Established by reading the actual code in this repository |
| `verified: config` | Established by reading the actual configuration |
| `measured` | Established by production metrics from this system |
| `load-tested` | Established by a reproducible load test of this system |
| `plausible` | Theoretically sound, not empirically verified in this system |
| `INSUFFICIENT DATA TO VERIFY` | Cannot be established from available information |

The phrase "best practice" is permitted only when backed by a named standard, the deployed vendor, the framework in use, or reproducible evidence. Otherwise write "architectural recommendation" and state the assumptions it rests on.

## Modes

Invoke with a mode argument. Without one, infer it from context and state which mode is running.

| Mode | Purpose | Workflow |
|---|---|---|
| `audit` | Full review of an existing application | Phases A to J below |
| `design` | Architecture for a new application, before implementation | Phase A (stack intent) then B, C, D, F, G, then `templates/architecture-decision.md` |
| `plan` | Rebuild or migration plan for an existing system | Requires a prior audit or runs A to D first, then `templates/migration-plan.md` |
| `review` | Gate a specific change (endpoint, service, schema, job, integration) | Architecture Gate below |
| `security` | Deep security audit | Phases A, B, D, plus `references/security.md` in full |
| `scale` | Deep scalability and performance audit | Phases A, B, C, E, plus `references/scalability.md` |
| `verify` | Check that implemented remediations actually work | Verification section below |

## Audit phases

Run in order. Do not skip Discovery, and do not ask the user anything that the repository can answer.

**A. Discovery.** Determine languages, frameworks, runtime, package manager, frontend, backend, database, ORM, cache, queue, auth, object storage, external APIs, hosting, containers, IaC, CI/CD, tests, monitoring, logging. Run `scripts/repo_inventory.py` first, then read what it points at. Read package manifests, lockfiles, env examples, Dockerfiles, compose files, infrastructure definitions, migrations, schemas, middleware, auth code, API routes, worker code, queue definitions, CI workflows, and logging config.

**B. Architecture Mapping.** Produce the architecture that actually exists, not the one intended. Components, trust boundaries, data flows, actors, entry points, external systems, sensitive data, secrets, admin interfaces. Render as a Mermaid diagram.

**C. Scalability Review.** Horizontal scaling, statelessness, database, cache, queues, external dependencies. See `references/scalability.md`. Answer explicitly: what happens technically when a second application instance starts?

**D. Security Review.** OWASP ASVS, OWASP Top 10, OWASP API Security Top 10, NIST SSDF. See `references/security.md` and `references/standards.md`.

**E. Performance Review.** Hot paths and candidate bottlenecks. Distinguish hypothesis from static analysis from benchmark from load test from production measurement. Never state a percentile that was not measured.

**F. Reliability Review.** Failure modes and resilience per external dependency. See `references/reliability.md`.

**G. Data Review.** Schema, transactions, constraints, indexes, query patterns, migrations, backup and restore. See `references/databases.md`.

**H. Operations Review.** Deployment, monitoring, logging, alerting, recovery. See `references/observability.md`.

**I. Supply Chain Review.** Dependencies, builds, CI/CD, secrets. See `references/devsecops.md`. Run `scripts/dependency_inventory.py`.

**J. Verification Plan.** Define the tests, benchmarks and measurements needed to close what could not be verified.

Run `scripts/magic_number_audit.py` during phase A and carry its output into the "Unsupported Numbers Found" section of the report.

Assemble the result with `templates/audit-report.md`. Write every finding with `templates/finding.md`.

In `audit` mode, do not make sweeping code changes. Produce analysis, evidence, target architecture and a remediation plan first. Implementation follows as a separate instruction from the user.

## Architecture Gate (review mode)

For a proposed feature or change, check request lifecycle, authentication, authorization, validation, database access, query count, transactions, caching, async jobs, external APIs, idempotency, failure modes, logging, metrics, security, deployment impact and migration impact.

Conclude with exactly one verdict:

- `APPROVED`
- `APPROVED WITH CONDITIONS` plus the conditions
- `BLOCKED` plus a concrete technical reason

`BLOCKED` requires a specific defect, not a stylistic preference.

## Architectural stance

**The simplest architecture that satisfies the verified requirements.**

The logical baseline is a cleanly separated layered architecture: presentation, then application and domain, then data and infrastructure. Physical deployment topology varies by project.

Microservices are not inherently more professional. A well structured modular monolith is the preferred recommendation unless service separation is justified by domain boundaries, differing scaling profiles, security boundaries, deployment requirements, or team ownership. Actively prevent microservices, Kafka, Kubernetes, Redis, read replicas, sharding, event sourcing and CQRS where no verified need exists. Every additional infrastructure component adds complexity, failure surface, security surface, operational load and cost.

Correspondingly, never recommend caching every query, never apply a blanket latency threshold for moving work to a queue, and never introduce sharding or read replicas prophylactically. See `references/caching.md` and `references/async-queues.md` for the decision inputs that replace those blanket rules.

## Findings and prioritisation

Every finding needs concrete evidence: a file and the relevant code location. Severity is `Blocker`, `Critical`, `High`, `Medium`, `Low` or `Informational`. Do not compute an invented numeric risk score.

Remediation order is not a matter of taste. Active security risks, data loss risks, tenant isolation failures, authentication and authorization defects, production outage risks, non-scalable single points and data integrity problems come first. Performance, observability, deployment and maintainability follow. State dependencies between remediation steps explicitly.

Separate dangerous technical debt from scalability risk, security risk, maintainability problems and pure style questions. Never bundle cosmetic refactoring with production-critical fixes.

## Verification after implementation

Code compiling is not a fix. Match the verification to the finding type:

| Finding | Verification |
|---|---|
| Security | Security test proving the vector is closed |
| Query problem | Query plan or benchmark, before and after |
| Scaling problem | Load test |
| Race condition | Concurrency test |
| Queue problem | Failure and retry test |
| Migration | Migration plus rollback test |
| Recovery problem | Actual restore test |

## Research discipline

When a technical number is needed and internet access is available, find the primary source. Source priority: official standard or RFC, then documentation of the deployed provider, then the framework, then the database or runtime, then OWASP, NIST, CNCF, OpenSSF or IETF, then a reproducible benchmark, then this project's production metrics, then this project's load test. Blogs, Reddit, Stack Overflow and SEO articles are never the sole basis for a production-relevant number.

Where sources conflict, the documentation of the version actually deployed wins. Check publication dates and whether a document is draft or final. A new draft does not silently supersede a stable normative version.

Never store a value as permanent truth when it is version dependent, provider dependent, plan dependent, region dependent or configuration dependent. Record the source and the scope of validity instead.

## Bundled resources

Load only what the current phase needs. Paths below are relative to this skill's directory, which is `C:\Users\DanKof\.claude\skills\production-architecture-guardian` in this installation. Use the absolute path when invoking a script from a working directory belonging to the audited project, since a relative path resolves against that project instead.

**references/** `standards.md` (verified versions and IDs of every framework this skill cites), `architecture.md`, `security.md`, `scalability.md`, `databases.md`, `caching.md`, `async-queues.md`, `reliability.md`, `observability.md`, `devsecops.md`

**templates/** `audit-report.md`, `finding.md`, `numerical-recommendation.md`, `architecture-decision.md`, `migration-plan.md`

**scripts/** `repo_inventory.py` (stack detection), `magic_number_audit.py` (unsourced configuration values), `dependency_inventory.py` (dependencies, lockfiles, pinning). All three are read-only and print structured output.

**examples/** `example-audit.md` shows the expected output shape and level of evidence.

For large audits, delegate to the `production-architecture-auditor` subagent to keep audit context separate from implementation context.

## Anti-hallucination check

Before every technical statement, verify internally: can this be supported by the repository, a primary source, a standard, or real measurement data? If not, do not state it as fact. For numbers this is absolute.
