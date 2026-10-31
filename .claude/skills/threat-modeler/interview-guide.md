# Interview guide

Use during step 3 of the SKILL.md. Goal: extract the things code cannot tell you, in under 30 minutes. Ask only the questions relevant to the scope — for a small feature you might use 5 questions; for a new service, 15. Never run the whole list.

The questions are deliberately blunt. Soft questions get soft answers, and a soft threat model is decoration.

---

## Block 1 — what's actually at stake (5 min)

1. If this feature/service is breached tomorrow, what's the worst thing that comes out in the news?
2. What data does it touch that a regulator would care about? (PII, PCI, PHI, biometric, financial records, government IDs)
3. What's the largest dollar amount that flows through this in a typical month?
4. Is there anything here that, if leaked, would cost a customer their job / marriage / safety? (sensitive-by-context data — adoption records, location traces, support transcripts about disputes)
5. What does a competitor learn if they get read-only access for a weekend?

---

## Block 2 — who's the attacker (5 min)

Don't say "hackers". Push for specifics.

1. Who's tried to abuse this product so far? (Real history — fraud attempts, scrapers, account-takeover signals, support-ticket patterns)
2. Are there organized actors who target this category? (Payment fraud rings hit fintech. Scrapers hit marketplaces. Stalkers hit social. Nation-states hit infra and identity.)
3. Are *users* a threat to each other? (Multi-tenant SaaS — could a malicious tenant pivot to another tenant's data? Marketplace — could a buyer scam a seller via the platform?)
4. Are *employees* a threat? (Insider access — who can read prod DB? Who can impersonate a user? Is it audited? Has anyone actually been fired for misuse?)
5. Is anyone in the company's threat profile dealing with state-level adversaries? (If the company runs a privacy product, a journalist tool, an opposition-finance platform — the answer changes the model entirely.)

---

## Block 3 — what's been deliberately accepted (5 min)

Threats that have been considered and accepted are not findings. Surface them so the model doesn't re-discover them as "bugs":

1. What security trade-offs have you already made deliberately? (e.g., "we don't enforce 2FA on free accounts because it kills conversion")
2. What does the admin app trust? (Network position? Hardware? VPN?)
3. What's exempted from the normal rules and why? (Service accounts? Test users? "God-mode" support tooling?)
4. Are there integrations where you trust the third party more than you'd ideally want to? (e.g., a webhook source that doesn't sign its requests)
5. Are there known-but-unfixed risks that are tracked elsewhere (Jira, security backlog)?

---

## Block 4 — boundaries and authority (5 min)

1. What's the actual trust boundary between your frontend and backend? (Is anything client-enforced that the server doesn't re-check?)
2. Where does authentication happen vs authorization? (Same place? Same layer? Can a request reach a handler with the auth check skipped?)
3. How is "this user is acting on behalf of org X" enforced? (`tenant_id` from session? From URL? From request body?)
4. What runs with elevated privilege? (Background jobs, cron, migrations, support tools)
5. Where do secrets live and who can read them? (Vault, KMS, env, .env.local on dev laptops, Slack DMs from 2 years ago)

---

## Block 5 — the audit / forensics question (5 min)

1. If a user complains "someone deleted my data" tomorrow, can you prove who did it from logs? (Not "we think we can" — actually trace it.)
2. If a leaked credential is found in a paste, how do you scope what it accessed and revoke it?
3. How do you find out about a breach? Who pages whom? What's the SLA on noticing?
4. Have you ever actually tested the incident-response playbook? (If no — that's an open question for the model.)

---

## Optional Block 6 — for privacy-heavy systems (LINDDUN)

Pull these in *in addition to* STRIDE when GDPR / HIPAA / biometric data is involved.

1. **Linkability**: can a third party correlate user activity across contexts the user thought were separate? (Stable user IDs in URLs, cookies that survive logout, fingerprintable response patterns)
2. **Identifiability**: are any "anonymized" datasets actually anonymous? (HIPAA-safe-harbor → in practice, postcode + birthdate + sex re-identifies most people)
3. **Detectability**: can an outside observer tell *that* a user has data in your system? (E.g., differential responses on lookup endpoints)
4. **Disclosure**: same as STRIDE-I but specifically about regulated personal data — and consent + lawful basis tracked?
5. **Right-to-be-forgotten**: can a user actually be deleted? Are there backups, derived analytics, logs, third-party processors that retain after deletion?

---

## How to run the interview

- **Cap at 30 minutes.** Anything longer becomes a workshop, and workshops don't get scheduled.
- **One question at a time.** Multi-part questions ("what data is sensitive, who's the attacker, and what have you accepted?") get vague answers.
- **Write the answer down before the next question.** A model built from memory of the conversation is worse than one built from notes.
- **Resist the urge to argue.** If the user says "we don't worry about insiders", record it as an *assumption* and move on. The model will surface whether that assumption is defensible.
- **Surface disagreements between team members.** "Engineering thinks tokens are 128-bit; ops says some legacy endpoints still use 64-bit" → that's an open question for engineering to resolve, not a guess to put in the model.

After the interview, draft the model. Review it with the same people. The version they sign off on is the one that goes into the repo.
