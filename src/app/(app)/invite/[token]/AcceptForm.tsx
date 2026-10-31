"use client";

import { useActionState } from "react";
import { Notice, SubmitButton } from "@/components/portal/ui";
import { acceptInvitation } from "./actions";

export function AcceptForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvitation, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <input type="hidden" name="token" value={token} />
      <SubmitButton disabled={pending} className="w-full">
        {pending ? "Joining…" : "Accept invitation"}
      </SubmitButton>
    </form>
  );
}
