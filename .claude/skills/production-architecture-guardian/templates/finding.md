# Finding

One block per finding. No finding without evidence from this repository.

---

### {Short, specific title stating the defect}

**Area**
Architecture / Security / Performance / Reliability / Data / Operations / Supply Chain

**Severity**
Blocker / Critical / High / Medium / Low / Informational

Do not compute an invented numeric risk score. Severity follows from the failure scenario, which is stated below.

**Evidence**
`path/to/file.ext:LINE`

```
{the actual code or configuration, minimally quoted}
```

**Problem**
{Technical description of what is wrong. Factual, no adjectives.}

**Failure scenario**
{Concrete: which input or state leads to which wrong outcome. If this cannot be written concretely, the finding is not yet understood well enough to report.}

**Why it matters here**
{The risk specific to this project, not a generic statement about the class of defect.}

**Standard**
{Cited identifier, for example `OWASP API Security Top 10 API1:2023` or `OWASP ASVS v5.0.0-<id>`, or the vendor documentation. Omit this field entirely rather than inventing a citation.}

**Remediation**
{The concrete technical change. Code or configuration where useful.}

**Verification**
{How to prove it is fixed. Match the type: security test, query plan, load test, concurrency test, restore test.}

**Numerical dependency**
Yes / No

{If yes, attach a `numerical-recommendation.md` block. A remediation that requires a number nobody has sourced is not complete, and saying so is part of the finding.}

---

## Severity guidance

| Severity | Use for |
|---|---|
| Blocker | Actively exploitable, or data loss is occurring or imminent. Stop and fix. |
| Critical | Exploitable access control or tenant isolation failure, exposed secret, unrecoverable data loss risk |
| High | Serious defect with a realistic path to exploitation or outage |
| Medium | Real defect, bounded impact or requiring unlikely preconditions |
| Low | Genuine but minor, or defence in depth |
| Informational | Observation, no defect established |

Do not inflate severity to create urgency, and do not deflate it because the fix is expensive. Write the failure scenario and let severity follow from it. Where severity depends on an unknown (whether a route is publicly reachable, whether the data is real), state the condition and the severity under each branch.

## Two failure modes to avoid

**The unfalsifiable finding.** "Error handling could be improved" cites nothing, proves nothing and cannot be closed. Every finding needs a file, a line and a scenario.

**The invented citation.** A plausible-looking requirement ID that was never read from the standard is worse than no citation, because it is authoritative in appearance and false in substance. Cite only what has been read.
