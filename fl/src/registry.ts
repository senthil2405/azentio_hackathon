/**
 * Human review of candidate models. Nothing deploys automatically.
 *   node fl/src/registry.ts approve <version> <reviewer> "<reason>"
 *   node fl/src/registry.ts reject  <version> <reviewer> "<reason>"
 *   node fl/src/registry.ts rollback <reviewer> "<reason>"     # restore the previously deployed version
 *   node fl/src/registry.ts status
 */
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REG = join(dirname(fileURLToPath(import.meta.url)), "..", "registry");
const [cmd, a, b, c] = process.argv.slice(2);
const deployedPath = join(REG, "deployed.json");
const deployed = JSON.parse(readFileSync(deployedPath, "utf8")) as { current: string | null; history: { version: string; at: string; by: string; reason: string }[] };
const log = (event: string, d: object) => appendFileSync(join(REG, "ledger.jsonl"), JSON.stringify({ at: new Date().toISOString(), event, ...d }) + "\n");

if (cmd === "approve" || cmd === "reject") {
  const path = join(REG, "models", `${a}.json`);
  const model = JSON.parse(readFileSync(path, "utf8"));
  if (model.status !== "candidate") throw new Error(`${a} is ${model.status}, not a candidate`);
  if (!b || !c) throw new Error("reviewer and reason are required");
  model.status = cmd === "approve" ? "approved" : "rejected";
  model.decision = { by: b, reason: c, at: new Date().toISOString() };
  writeFileSync(path, JSON.stringify(model, null, 2));
  if (cmd === "approve") {
    deployed.history.push({ version: a, at: model.decision.at, by: b, reason: c });
    deployed.current = a;
    writeFileSync(deployedPath, JSON.stringify(deployed, null, 2));
  }
  log(`model.${cmd}d`, { version: a, by: b, reason: c });
  console.log(`${a}: ${model.status}`);
} else if (cmd === "rollback") {
  if (deployed.history.length < 2) throw new Error("no previous deployment to roll back to");
  const removed = deployed.history.pop()!;
  deployed.current = deployed.history.at(-1)!.version;
  writeFileSync(deployedPath, JSON.stringify(deployed, null, 2));
  log("model.rollback", { from: removed.version, to: deployed.current, by: a, reason: b });
  console.log(`rolled back ${removed.version} → ${deployed.current}`);
} else {
  console.log(JSON.stringify(deployed, null, 2));
}
