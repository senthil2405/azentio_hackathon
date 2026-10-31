import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Fixed-window limit (plan.md D9). Limits are targets to be tuned with real traffic. */
export async function rateLimit(scope: string, key: string, max: number, windowSeconds: number): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_bucket: `${scope}:${key.toLowerCase()}:${ip}`,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) return false; // fail closed
  return data === true;
}
