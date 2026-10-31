"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/server/rate-limit";

export type PublicFormState = { status?: "received" | "error"; message?: string };

const email = z.string().trim().toLowerCase().email().max(254);

export async function submitDemoRequest(_: PublicFormState, form: FormData): Promise<PublicFormState> {
  const parsed = z
    .object({
      interest: z.string().trim().min(2).max(80),
      name: z.string().trim().min(2).max(80),
      email,
      organisation: z.string().trim().min(2).max(120),
      message: z.string().trim().min(5).max(2000),
    })
    .safeParse({ interest: form.get("interest"), name: form.get("name"), email: form.get("email"), organisation: form.get("organization") || "Not provided", message: form.get("message") });
  if (!parsed.success) return { status: "error", message: "Please check the highlighted fields: name, a valid work email and a short message are required." };
  if (!(await rateLimit("demo", parsed.data.email, 10, 900))) return { status: "error", message: "Too many requests. Please try again later." };
  // Service role is used only to insert into an intake table that anonymous users cannot read.
  const { error } = await createAdminClient().from("demo_requests").insert(parsed.data);
  if (error) return { status: "error", message: "We couldn’t record your request. Please try again." };
  return { status: "received", message: "Thanks — your request was received. Our team will reply by email. (Synthetic environment: no email is sent.)" };
}

export async function submitHackathonRegistration(_: PublicFormState, form: FormData): Promise<PublicFormState> {
  if (String(form.get("website") ?? "") !== "") return { status: "received", message: "Thanks — your interest was registered." }; // honeypot
  const parsed = z
    .object({ name: z.string().trim().min(2).max(80), email, consent: z.literal("on") })
    .safeParse({ name: form.get("name"), email: form.get("email"), consent: form.get("consent") });
  if (!parsed.success) return { status: "error", message: "Enter your name, a valid email and confirm consent." };
  if (!(await rateLimit("hackathon", parsed.data.email, 10, 900))) return { status: "error", message: "Too many requests. Please try again later." };
  const { error } = await createAdminClient().from("hackathon_registrations").insert({ name: parsed.data.name, email: parsed.data.email });
  if (error) return { status: "error", message: "We couldn’t record your registration. Please try again." };
  return { status: "received", message: "Thanks — your interest was registered. We’ll share dates and details when they’re announced." };
}
