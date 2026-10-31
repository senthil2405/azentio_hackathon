/**
 * A participant's training job. Runs as its own process with access ONLY to its own dataset file.
 * Input (stdin): the global model. Output (stdout): a parameter delta + sample count. No examples leave.
 * Usage: node fl/src/client.ts <participant-id> <data.json> [--fail] [--poison]
 */
import { readFileSync } from "node:fs";
import { SCHEMA_VERSION, type Example, type Model } from "./schema.ts";
import { trainLocal } from "./train.ts";

const [participant, dataPath, ...flags] = process.argv.slice(2);
if (flags.includes("--fail")) {
  process.stderr.write(`${participant}: simulated outage\n`);
  process.exit(3);
}
const data = JSON.parse(readFileSync(dataPath, "utf8")) as Example[];
const global = JSON.parse(readFileSync(0, "utf8")) as Model;
const local = trainLocal(global.params, data, { epochs: 5, lr: 0.1, seed: participant.length });
let delta = local.map((w, i) => w - global.params[i]);
if (flags.includes("--poison")) delta = delta.map((d) => -40 * d); // simulated malicious/broken update
process.stdout.write(JSON.stringify({ participant, schemaVersion: SCHEMA_VERSION, baseVersion: global.version, delta, n: data.length }));
