"use client";

import { useActionState, useState } from "react";
import { Flag } from "lucide-react";
import { Notice, SubmitButton, Textarea } from "@/components/portal/ui";
import { reportShared } from "@/server/learning/actions";

export function ReportButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [s, action, pending] = useActionState(reportShared, {});
  if (s.ok) return <Notice tone="success">{s.ok}</Notice>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive">
        <Flag aria-hidden className="size-3.5" /> Report
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      {s.error && <Notice tone="error">{s.error}</Notice>}
      <label htmlFor={`reason-${id}`} className="text-xs font-semibold text-navy">Why is this misleading, confidential or inappropriate? You don’t need to name anyone.</label>
      <Textarea id={`reason-${id}`} name="reason" className="min-h-16" maxLength={1000} required />
      <div className="flex gap-2">
        <SubmitButton variant="danger" disabled={pending}>Send report</SubmitButton>
        <SubmitButton type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</SubmitButton>
      </div>
    </form>
  );
}
