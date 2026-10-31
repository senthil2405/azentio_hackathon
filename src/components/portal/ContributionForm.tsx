"use client";

import { useActionState, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Field, Input, Notice, Select, SubmitButton, Textarea } from "@/components/portal/ui";
import { CONFIDENCE, CONTRIBUTION_TYPES, EVIDENCE_TYPES, OFFERINGS, sensitiveHints, type ContributionFields } from "@/server/learning/schema";
import type { FormState } from "@/server/learning/actions";

type Props = {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  initial?: Partial<ContributionFields> & { id?: string };
  mode: "create" | "edit" | "revise";
};

export function ContributionForm({ action, initial = {}, mode }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [text, setText] = useState(`${initial.title ?? ""} ${initial.body ?? ""}`);
  const [visibility, setVisibility] = useState<"author_only" | "org" | "propose_community">("author_only");
  const hints = useMemo(() => sensitiveHints(text), [text]);
  const err = (k: string) => state.fieldErrors?.[k];
  const aria = (k: string) => (err(k) ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});

  return (
    <form action={formAction} className="space-y-6" onChange={(e) => {
      const f = e.currentTarget;
      setText(`${(f.elements.namedItem("title") as HTMLInputElement)?.value ?? ""} ${(f.elements.namedItem("body") as HTMLTextAreaElement)?.value ?? ""}`);
    }}>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {mode === "revise" && (
        <Notice tone="warning">This contribution is published. Saving creates a new version that goes back to moderator review. The current shared version stays unchanged until the revision is approved.</Notice>
      )}

      <Notice tone="warning">
        <strong>Before you write:</strong> leave out customer names, account numbers, transaction-level data, credentials, confidential contract terms and anything else restricted. Our automatic check only flags likely problems; it is not a privacy guarantee.
      </Notice>

      <div className="grid gap-4 md:grid-cols-2">
        <Field id="type" label="Type" error={err("type")}>
          <Select id="type" name="type" defaultValue={initial.type ?? "market_observation"} {...aria("type")}>
            {Object.entries(CONTRIBUTION_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field id="offering" label="Offering" error={err("offering")}>
          <Select id="offering" name="offering" defaultValue={initial.offering ?? OFFERINGS[0]} {...aria("offering")}>
            {OFFERINGS.map((o) => <option key={o}>{o}</option>)}
          </Select>
        </Field>
        <Field id="industry" label="Industry" error={err("industry")}>
          <Input id="industry" name="industry" required maxLength={80} defaultValue={initial.industry ?? ""} {...aria("industry")} />
        </Field>
        <Field id="region" label="Region" hint="Prefer a broad region; moderators may coarsen it further." error={err("region")}>
          <Input id="region" name="region" required maxLength={80} defaultValue={initial.region ?? ""} {...aria("region")} />
        </Field>
        <Field id="period_start" label="Observation period start" error={err("period_start")}>
          <Input id="period_start" name="period_start" type="date" required defaultValue={initial.period_start ?? ""} {...aria("period_start")} />
        </Field>
        <Field id="period_end" label="Observation period end" error={err("period_end")}>
          <Input id="period_end" name="period_end" type="date" required defaultValue={initial.period_end ?? ""} {...aria("period_end")} />
        </Field>
        <Field id="evidence_type" label="Evidence type" error={err("evidence_type")}>
          <Select id="evidence_type" name="evidence_type" defaultValue={initial.evidence_type ?? "anecdotal"}>
            {Object.entries(EVIDENCE_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field id="confidence" label="Confidence" error={err("confidence")}>
          <Select id="confidence" name="confidence" defaultValue={initial.confidence ?? "low"}>
            {Object.entries(CONFIDENCE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
      </div>
      <Field id="title" label="Title" error={err("title")}>
        <Input id="title" name="title" required minLength={5} maxLength={120} defaultValue={initial.title ?? ""} {...aria("title")} />
      </Field>
      <Field id="body" label="What did you observe?" hint="20–4,000 characters." error={err("body")}>
        <Textarea id="body" name="body" required minLength={20} maxLength={4000} defaultValue={initial.body ?? ""} {...aria("body")} />
      </Field>
      <Field id="links" label="Supporting links (optional)" hint="One http(s) link per line, up to 5. Attachments aren’t supported in this version." error={err("links")}>
        <Textarea id="links" name="links" className="min-h-20" defaultValue={(initial.links ?? []).join("\n")} />
      </Field>

      {hints.length > 0 && (
        <p role="status" className="flex items-start gap-2 rounded-md border border-warning/40 bg-[#fff8ef] px-4 py-3 text-sm text-warning">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          This text may contain {hints.join(", ")}. Remove it unless it is essential; a moderator will review flagged content before any sharing.
        </p>
      )}

      {mode === "create" && (
        <fieldset className="space-y-3 rounded-lg border border-border bg-white p-5">
          <legend className="px-1 text-sm font-bold text-navy">Who should be able to see this?</legend>
          {([
            ["author_only", "Only me (private draft)", "Nobody else can see it, including moderators."],
            ["org", "My organisation", "Members of your organisation’s workspace. Never other organisations."],
            ["propose_community", "Propose to the learning community", "A moderator reviews and de-identifies it before anything is shared with other organisations."],
          ] as const).map(([v, l, d]) => (
            <label key={v} className="flex cursor-pointer gap-3 rounded-md border border-border p-3 has-checked:border-green-ink has-checked:bg-[#effaf3]">
              <input type="radio" name="visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} className="mt-1 accent-green-ink" />
              <span><span className="block text-sm font-semibold text-navy">{l}</span><span className="text-xs text-muted-foreground">{d}</span></span>
            </label>
          ))}
          <div className="space-y-2 border-t border-border pt-3 text-sm">
            <p className="font-semibold text-navy">Permissions (each is separate)</p>
            <label className="flex gap-2"><input type="checkbox" name="consent_store" defaultChecked required className="accent-green-ink" /> Store and process this contribution (required)</label>
            <label className="flex gap-2"><input type="checkbox" name="consent_publish" disabled={visibility !== "propose_community"} className="accent-green-ink" /> Publish a moderator-reviewed, de-identified version to the learning community</label>
            <label className="flex gap-2"><input type="checkbox" name="consent_attribution" disabled={visibility !== "propose_community"} className="accent-green-ink" /> Show my organisation’s name on the shared version (optional, reviewed)</label>
            <label className="flex gap-2"><input type="checkbox" name="consent_training" className="accent-green-ink" /> Include in any future model-training or federated-learning programme (optional; no such programme uses it today)</label>
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-3">
        <SubmitButton name="intent" value="save" variant={mode === "create" && visibility !== "author_only" ? "outline" : "primary"} disabled={pending}>
          {mode === "create" ? "Save private draft" : mode === "revise" ? "Submit revision for review" : "Save changes"}
        </SubmitButton>
        {mode === "create" && visibility !== "author_only" && (
          <SubmitButton name="intent" value="share" disabled={pending}>
            {visibility === "org" ? "Save and share with my organisation" : "Save and submit for review"}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
