"use client";

import { useActionState, type ReactNode } from "react";
import type { PublicFormState } from "@/server/public/actions";

type Props = { className: string; action: (s: PublicFormState, f: FormData) => Promise<PublicFormState>; children: ReactNode };

/** Wraps the prototype's form markup with a server action and an accessible status message. */
export function PublicForm({ className, action, children }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form className={className} action={formAction} aria-busy={pending}>
      {children}
      <p role={state.status === "error" ? "alert" : "status"} style={{ marginTop: 12, fontSize: 14, color: state.status === "error" ? "#b42318" : "#247447" }}>
        {state.message}
      </p>
    </form>
  );
}
