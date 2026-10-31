"use client";

import { useActionState } from "react";
import { Field, Input, Notice, Select, SubmitButton, Textarea } from "@/components/portal/ui";
import { saveIdea, saveTheme } from "@/server/insights/actions";
import { OFFERINGS } from "@/server/learning/schema";

type Evidence = { id: string; title: string; period_coarse: string };

function EvidencePicker({ evidence, selected }: { evidence: Evidence[]; selected: string[] }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-navy">Supporting evidence (published shared contributions only)</legend>
      <div className="max-h-64 space-y-1 overflow-auto rounded-md border border-border bg-white p-3">
        {evidence.length === 0 && <p className="text-sm text-muted-foreground">No published contributions yet.</p>}
        {evidence.map((e) => (
          <label key={e.id} className="flex gap-2 text-sm">
            <input type="checkbox" name="evidence" value={e.id} defaultChecked={selected.includes(e.id)} className="accent-green-ink" />
            <span>{e.title} <span className="text-muted-foreground">· {e.period_coarse}</span></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ThemeForm({ evidence, initial }: { evidence: Evidence[]; initial?: { id: string; title: string; summary: string; limitations: string; offering: string | null; evidence: string[] } }) {
  const [s, action, pending] = useActionState(saveTheme, {});
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <Field id="title" label="Theme"><Input id="title" name="title" defaultValue={initial?.title} maxLength={120} required /></Field>
      <Field id="offering" label="Relevant offering">
        <Select id="offering" name="offering" defaultValue={initial?.offering ?? ""}><option value="">Several / none</option>{OFFERINGS.map((o) => <option key={o}>{o}</option>)}</Select>
      </Field>
      <Field id="summary" label="Summary" hint="Describe the pattern. Don’t claim prevalence or causation."><Textarea id="summary" name="summary" defaultValue={initial?.summary} maxLength={2000} /></Field>
      <Field id="limitations" label="Confidence & limitations" hint="e.g. small sample, self-reported, one region."><Textarea id="limitations" name="limitations" className="min-h-20" defaultValue={initial?.limitations} maxLength={1000} /></Field>
      <EvidencePicker evidence={evidence} selected={initial?.evidence ?? []} />
      <SubmitButton disabled={pending}>Save theme</SubmitButton>
    </form>
  );
}

type IdeaInitial = { id: string; title: string; problem: string; offering: string; proposed_outcome: string; owner_team: string; priority: string; theme_id: string | null; evidence: string[] };

export function IdeaForm({ evidence, themes, initial }: { evidence: Evidence[]; themes: { id: string; title: string }[]; initial?: IdeaInitial }) {
  const [s, action, pending] = useActionState(saveIdea, {});
  return (
    <form action={action} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <Field id="title" label="Title"><Input id="title" name="title" defaultValue={initial?.title} maxLength={120} required /></Field>
      <Field id="problem" label="Problem statement (internal)"><Textarea id="problem" name="problem" className="min-h-20" defaultValue={initial?.problem} maxLength={2000} required /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="offering" label="Offering"><Select id="offering" name="offering" defaultValue={initial?.offering ?? OFFERINGS[0]}>{OFFERINGS.map((o) => <option key={o}>{o}</option>)}</Select></Field>
        <Field id="owner_team" label="Owner / team"><Input id="owner_team" name="owner_team" defaultValue={initial?.owner_team} maxLength={80} required /></Field>
        <Field id="priority" label="Priority (internal)"><Select id="priority" name="priority" defaultValue={initial?.priority ?? "medium"}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></Field>
      </div>
      <Field id="proposed_outcome" label="Proposed outcome"><Textarea id="proposed_outcome" name="proposed_outcome" className="min-h-20" defaultValue={initial?.proposed_outcome} maxLength={2000} required /></Field>
      <Field id="theme_id" label="Linked theme">
        <Select id="theme_id" name="theme_id" defaultValue={initial?.theme_id ?? ""}><option value="">None</option>{themes.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</Select>
      </Field>
      <EvidencePicker evidence={evidence} selected={initial?.evidence ?? []} />
      <SubmitButton disabled={pending}>Save idea</SubmitButton>
    </form>
  );
}
