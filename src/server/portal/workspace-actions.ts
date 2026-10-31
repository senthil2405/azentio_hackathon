"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Switch the session-bound active workspace. The DB verifies membership; the client value is only a request. */
export async function switchWorkspace(form: FormData) {
  const org = z.string().uuid().safeParse(form.get("org"));
  if (!org.success) return;
  const supabase = await createClient();
  await supabase.rpc("set_active_org", { p_org: org.data });
  redirect("/portal");
}
