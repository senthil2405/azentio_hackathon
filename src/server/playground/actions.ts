"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { scenarioFor, type ScenarioResult } from "./scenarios";

export type RunState = { runId?: string; result?: ScenarioResult; error?: string; feedbackSaved?: boolean };

export async function runScenario(_: RunState, form: FormData): Promise<RunState> {
  const scenario = scenarioFor(String(form.get("slug")));
  if (!scenario) return { error: "Unknown scenario." };
  const inputs: Record<string, number> = {};
  for (const i of scenario.inputs) {
    const n = z.coerce.number().finite().min(0).max(1e7).safeParse(form.get(i.key));
    if (!n.success) return { error: `${i.label} must be a number.` };
    inputs[i.key] = n.data;
  }
  const seasonalAdjust = form.get("seasonal") === "on";
  const result = scenario.run(inputs, { seasonalAdjust });
  const supabase = await createClient();
  // The DB re-checks employee status or the active org's entitlement before storing the run.
  const { data, error } = await supabase.rpc("playground_record", {
    p_product: scenario.slug, p_scenario: scenario.title, p_inputs: { ...inputs, seasonalAdjust }, p_outputs: result,
  });
  if (error) return { error: "This sandbox isn’t available to you." };
  return { runId: data, result };
}

export async function sendFeedback(state: RunState, form: FormData): Promise<RunState> {
  const run = z.string().uuid().safeParse(form.get("run"));
  const rating = z.enum(["useful", "needs_evidence", "not_useful"]).safeParse(form.get("rating"));
  if (!run.success || !rating.success) return { ...state, error: "Choose a rating." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("playground_feedback", { p_run: run.data, p_feedback: { rating: rating.data, comment: String(form.get("comment") ?? "").slice(0, 1000) } });
  return error ? { ...state, error: "Could not save feedback." } : { ...state, feedbackSaved: true };
}
