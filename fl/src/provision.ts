/** Provision each participant's isolated synthetic dataset into its own directory (simulates separate environments). */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PARTICIPANTS, generate } from "./data.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const p of PARTICIPANTS) {
  const dir = join(ROOT, "clients", p.id);
  mkdirSync(dir, { recursive: true });
  const data = generate(p.n, p.seed, p.seasonality, p.bias);
  writeFileSync(join(dir, "data.json"), JSON.stringify(data));
  const rate = data.filter((e) => e.y === 1).length / data.length;
  console.log(`${p.id}: ${data.length} synthetic examples, default rate ${(rate * 100).toFixed(1)}%, seasonality ${p.seasonality}`);
}
