"use client";

import { useActionState } from "react";
import { Field, Input, Notice, Select, SubmitButton } from "@/components/portal/ui";
import { inviteMember } from "@/server/members/actions";

export function InviteForm() {
  const [s, action, pending] = useActionState(inviteMember, {});
  return (
    <form action={action} className="space-y-4">
      {s.error && <Notice tone="error">{s.error}</Notice>}
      {s.link && (
        <Notice tone="success">
          Invitation created for <strong>{s.email}</strong>. Copy this single-use link now (it expires in 72 hours and won’t be shown again):
          <code className="mt-2 block break-all rounded bg-white p-2 text-xs text-navy">{s.link}</code>
          Email delivery is not enabled in this environment — nothing was sent.
        </Notice>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
        <Field id="email" label="Email to invite"><Input id="email" name="email" type="email" required maxLength={254} /></Field>
        <Field id="role" label="Role"><Select id="role" name="role" defaultValue="member"><option value="member">Member</option><option value="client_admin">Client administrator</option></Select></Field>
        <SubmitButton disabled={pending}>Create invitation</SubmitButton>
      </div>
    </form>
  );
}
