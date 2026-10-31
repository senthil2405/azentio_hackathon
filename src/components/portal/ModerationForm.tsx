"use client";

import { useActionState } from "react";
import { Field, Input, Notice, SubmitButton, Textarea } from "@/components/portal/ui";
import { moderate } from "@/server/learning/actions";

type Props = { id: string; state: string; title: string; body: string; regionSuggestion: string; periodSuggestion: string; attributionConsent: boolean };

export function ModerationForm(p: Props) {
  const [s, action, pending] = useActionState(moderate, {});
  const reviewable = p.state === "submitted" || p.state === "published";
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={p.id} />
      {s.error && <Notice tone="error">{s.error}</Notice>}
      {reviewable && (
        <fieldset className="space-y-4 rounded-lg border border-border bg-white p-5">
          <legend className="px-1 text-sm font-bold text-navy">Reviewed shared version (only these fields are published)</legend>
          <p className="text-xs text-muted-foreground">Remove names, exact places, dates and unusual transaction details that could identify a contributor or customer. Removing a name alone does not make a rare observation anonymous.</p>
          <Field id="shared_title" label="Shared title"><Input id="shared_title" name="shared_title" defaultValue={p.title} maxLength={120} required /></Field>
          <Field id="shared_body" label="Shared summary"><Textarea id="shared_body" name="shared_body" defaultValue={p.body} maxLength={4000} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="region_coarse" label="Coarse region" hint="e.g. South Asia"><Input id="region_coarse" name="region_coarse" defaultValue={p.regionSuggestion} required /></Field>
            <Field id="period_coarse" label="Coarse period" hint="e.g. 2026-Q3 or 2026-H1"><Input id="period_coarse" name="period_coarse" defaultValue={p.periodSuggestion} required /></Field>
          </div>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="attribute" disabled={!p.attributionConsent} className="accent-green-ink" />
            Show the organisation’s name {p.attributionConsent ? "(contributor opted in)" : "(contributor did not consent)"}
          </label>
        </fieldset>
      )}
      <Field id="public_reason" label="Message to the contributor" hint="Required for clarification or rejection. Visible to the contributor.">
        <Textarea id="public_reason" name="public_reason" className="min-h-20" maxLength={1000} />
      </Field>
      <Field id="private_note" label="Private reviewer note" hint="Moderators only. Never shown to the contributor or in shared payloads.">
        <Textarea id="private_note" name="private_note" className="min-h-16" maxLength={2000} />
      </Field>
      <div className="flex flex-wrap gap-3">
        {reviewable && <SubmitButton name="action" value="publish" disabled={pending}>{p.state === "published" ? "Approve revision" : "Publish reviewed version"}</SubmitButton>}
        {p.state === "submitted" && <SubmitButton name="action" value="request_clarification" variant="outline" disabled={pending}>Request clarification</SubmitButton>}
        {p.state === "submitted" && <SubmitButton name="action" value="reject" variant="danger" disabled={pending}>Reject</SubmitButton>}
        {p.state === "published" && <SubmitButton name="action" value="unpublish" variant="outline" disabled={pending}>Temporarily unpublish</SubmitButton>}
        {p.state === "under_review" && <SubmitButton name="action" value="republish" disabled={pending}>Republish</SubmitButton>}
        {p.state === "under_review" && <SubmitButton name="action" value="remove" variant="danger" disabled={pending}>Remove</SubmitButton>}
      </div>
    </form>
  );
}
