import { execSync } from "node:child_process";

/** Fresh, deterministic seed (also clears rate-limit windows) before persona journeys. */
export default function globalSetup() {
  execSync("npx supabase db reset", { stdio: "inherit" });
  execSync(`curl -s -X DELETE http://127.0.0.1:54324/api/v1/messages`, { stdio: "ignore" });
}
