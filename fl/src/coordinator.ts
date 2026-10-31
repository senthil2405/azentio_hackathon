/**
 * Federated coordinator. Never reads participant data files; receives only updates.
 * Usage: node fl/src/coordinator.ts <scenario: normal|dropout|poison> [rounds]
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DIM, SCHEMA_VERSION, type Model } from "./schema.ts";
import { HOLDOUT, PARTICIPANTS, generate } from "./data.ts";
import { evaluate, trainLocal } from "./train.ts";
import { POLICY, fedAvg, validate, type Update } from "./aggregate.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REG = join(ROOT, "registry");
const scenario = (process.argv[2] ?? "normal") as "normal" | "dropout" | "poison";
const rounds = Number(process.argv[3] ?? 5);
mkdirSync(join(REG, "models"), { recursive: true });

const ledger = (event: string, detail: Record<string, unknown>) =>
  appendFileSync(join(REG, "ledger.jsonl"), JSON.stringify({ at: new Date().toISOString(), scenario, event, ...detail }) + "\n");

// Programme consent is separate from portal membership and publishing consent (spec §09).
const consents = JSON.parse(readFileSync(join(ROOT, "programme", "consents.json"), "utf8")) as Record<string, { trainingConsent: boolean; withdrawnAt: string | null }>;
const eligible = PARTICIPANTS.filter((p) => consents[p.id]?.trainingConsent && !consents[p.id]?.withdrawnAt);
ledger("programme.start", { schemaVersion: SCHEMA_VERSION, aggregation: "FedAvg (sample-weighted, capped)", policy: POLICY, eligible: eligible.map((p) => p.id), excluded: PARTICIPANTS.filter((p) => !eligible.includes(p)).map((p) => p.id) });

const holdout = generate(HOLDOUT.n, HOLDOUT.seed, HOLDOUT.seasonality, HOLDOUT.bias); // coordinator-owned synthetic holdout
let model: Model = { version: `${scenario}-r0`, schemaVersion: SCHEMA_VERSION, params: new Array(DIM).fill(0) };

for (let r = 1; r <= rounds; r++) {
  const updates: Update[] = [];
  const dropped: string[] = [];
  for (const p of eligible) {
    const flags = [
      ...(scenario === "dropout" && p.id === "client-eastgate" && r >= 2 ? ["--fail"] : []),
      ...(scenario === "poison" && p.id === "client-meridian" ? ["--poison"] : []),
    ];
    const res = spawnSync(process.execPath, [join(ROOT, "src", "client.ts"), p.id, join(ROOT, "clients", p.id, "data.json"), ...flags], { input: JSON.stringify(model), encoding: "utf8", timeout: 30_000 });
    if (res.status !== 0) { dropped.push(p.id); continue; }
    updates.push(JSON.parse(res.stdout) as Update);
  }
  const { accepted, rejected } = validate(updates, model.version);
  // Log metadata only: participant ids, norms, sample counts, reasons. Never deltas' source examples.
  ledger("round.updates", { round: r, received: updates.map((u) => ({ participant: u.participant, n: u.n })), dropped, rejected, accepted: accepted.map((u) => ({ participant: u.participant, norm: u.norm, clipped: u.clipped })) });
  if (accepted.length < POLICY.minParticipants) {
    ledger("round.aborted", { round: r, reason: `fewer than ${POLICY.minParticipants} valid participants`, modelUnchanged: model.version });
    continue;
  }
  const { params, weights } = fedAvg(model.params, accepted);
  model = { version: `${scenario}-r${r}`, schemaVersion: SCHEMA_VERSION, params };
  ledger("round.aggregated", { round: r, version: model.version, weights, holdout: evaluate(params, holdout) });
}

// Baselines: majority class, and each participant's model trained only on its own data (no federation).
const majority = holdout.filter((e) => e.y === 1).length > holdout.length / 2 ? 1 : 0;
const majorityAcc = +(holdout.filter((e) => e.y === majority).length / holdout.length).toFixed(4);
const localOnly = Object.fromEntries(eligible.map((p) => {
  const own = generate(p.n, p.seed, p.seasonality, p.bias); // computed for the report as each client would locally; reported metrics only
  return [p.id, evaluate(trainLocal(new Array(DIM).fill(0), own, { epochs: 5 * rounds, seed: p.id.length }), holdout)];
}));
const result = { candidate: model.version, global: evaluate(model.params, holdout), baselines: { majorityClassAccuracy: majorityAcc, localOnly } };
ledger("evaluation", result);

// Register as CANDIDATE only. Deployment requires an explicit human decision (registry.ts).
const record = { ...model, status: "candidate", createdAt: new Date().toISOString(), scenario, evaluation: result, lineage: { participants: eligible.map((p) => p.id), rounds, policy: POLICY }, decision: null };
writeFileSync(join(REG, "models", `${model.version}.json`), JSON.stringify(record, null, 2));
ledger("model.registered", { version: model.version, status: "candidate" });
if (!existsSync(join(REG, "deployed.json"))) writeFileSync(join(REG, "deployed.json"), JSON.stringify({ current: null, history: [] }, null, 2));
console.log(JSON.stringify(result, null, 2));
