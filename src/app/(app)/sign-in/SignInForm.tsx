"use client";

import { useActionState } from "react";
import { Field, Input, Notice, SubmitButton } from "@/components/portal/ui";
import { requestCode, verifyCode, type SignInState } from "./actions";

export function SignInForm({ next }: { next: string }) {
  const [emailState, sendCode, sending] = useActionState(requestCode, { step: "email" } as SignInState);
  const [codeState, checkCode, checking] = useActionState(verifyCode, { step: "code" } as SignInState);
  const email = emailState.email;

  if (emailState.step === "email" || !email) {
    return (
      <form action={sendCode} className="space-y-4" noValidate>
        {emailState.error && <Notice tone="error">{emailState.error}</Notice>}
        <Field id="email" label="Work email" hint="Employees use their @azentio.com address. Clients use the address their invitation was sent to.">
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} aria-describedby="email-hint" />
        </Field>
        <SubmitButton disabled={sending} className="w-full">
          {sending ? "Sending…" : "Email me a sign-in code"}
        </SubmitButton>
      </form>
    );
  }
  return (
    <form action={checkCode} className="space-y-4" noValidate>
      {emailState.message && !codeState.error && <Notice>{emailState.message}</Notice>}
      {codeState.error && <Notice tone="error">{codeState.error}</Notice>}
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <Field id="code" label="6-digit code">
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus />
      </Field>
      <SubmitButton disabled={checking} className="w-full">
        {checking ? "Checking…" : "Sign in"}
      </SubmitButton>
    </form>
  );
}
