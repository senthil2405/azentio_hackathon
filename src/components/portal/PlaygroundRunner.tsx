"use client";

import { useActionState } from "react";
import { Card, Field, Input, Notice, SubmitButton, SyntheticLabel, Textarea } from "@/components/portal/ui";
import { runScenario, sendFeedback, type RunState } from "@/server/playground/actions";

type Props = { slug: string; inputs: { key: string; label: string; value: number; unit: string }[] };

export function PlaygroundRunner({ slug, inputs }: Props) {
  const [state, run, running] = useActionState(runScenario, {} as RunState);
  const [fb, feedback, sending] = useActionState(sendFeedback, {} as RunState);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-1 text-lg font-bold text-navy">1 · Inspect the synthetic inputs</h2>
        <p className="mb-4 text-xs text-muted-foreground">All values are synthetic sample data.</p>
        <form action={run} className="space-y-4">
          <input type="hidden" name="slug" value={slug} />
          {inputs.map((i) => (
            <Field key={i.key} id={i.key} label={`${i.label} (${i.unit})`}>
              <Input id={i.key} name={i.key} type="number" step="any" min={0} defaultValue={i.value} required />
            </Field>
          ))}
          <label className="flex gap-2 text-sm"><input type="checkbox" name="seasonal" className="accent-green-ink" /> Use seasonality-aware comparison</label>
          <SubmitButton disabled={running}>{running ? "Running…" : "2 · Run deterministic demo"}</SubmitButton>
        </form>
      </Card>
      <div className="space-y-4">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        {state.result ? (
          <Card className="space-y-4">
            <SyntheticLabel />
            <h2 className="text-lg font-bold text-navy">3 · Review the evidence</h2>
            <p className="font-semibold">{state.result.headline}</p>
            <p className="text-sm">Simulated indicator: <strong>{state.result.indicator}</strong> ({state.result.band})</p>
            <dl className="divide-y divide-border rounded-md border border-border text-sm">
              {state.result.evidence.map((e) => <div key={e.label} className="flex justify-between gap-4 px-3 py-2"><dt className="text-muted-foreground">{e.label}</dt><dd className="font-semibold">{e.value}</dd></div>)}
            </dl>
            <p className="text-xs font-semibold text-warning">{state.result.caveat}</p>
            {fb.feedbackSaved ? <Notice tone="success">Thanks — your feedback was recorded.</Notice> : (
              <form action={feedback} className="space-y-3 border-t border-border pt-4">
                <input type="hidden" name="run" value={state.runId} />
                <fieldset className="flex flex-wrap gap-4 text-sm"><legend className="mb-2 font-bold text-navy">4 · Structured feedback</legend>
                  <label className="flex gap-2"><input type="radio" name="rating" value="useful" required className="accent-green-ink" /> Useful</label>
                  <label className="flex gap-2"><input type="radio" name="rating" value="needs_evidence" className="accent-green-ink" /> Needs more evidence</label>
                  <label className="flex gap-2"><input type="radio" name="rating" value="not_useful" className="accent-green-ink" /> Not useful</label>
                </fieldset>
                <Textarea name="comment" className="min-h-16" maxLength={1000} placeholder="What would make this more useful? (no customer data)" aria-label="Feedback comment" />
                {fb.error && <Notice tone="error">{fb.error}</Notice>}
                <SubmitButton variant="outline" disabled={sending}>Send feedback</SubmitButton>
              </form>
            )}
          </Card>
        ) : <Card><p className="text-sm text-muted-foreground">Run the demo to see a simulated result and its evidence.</p></Card>}
      </div>
    </div>
  );
}
