import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const ORG = {
  azentio: "00000000-0000-4000-a000-000000000001",
  northbank: "00000000-0000-4000-a000-0000000000a1",
  meridian: "00000000-0000-4000-a000-0000000000b2",
  eastgate: "00000000-0000-4000-a000-0000000000c3",
} as const;

export const EMAIL = {
  employee: "alex.employee@azentio.com",
  moderator: "maya.moderator@azentio.com",
  owner: "priya.owner@azentio.com",
  publisher: "paul.publisher@azentio.com",
  admin: "ada.admin@azentio.com",
  newhire: "newhire@azentio.com",
  ana: "ana@northbank.example",
  carlAdmin: "carl.admin@northbank.example",
  bea: "bea@meridian.example",
  cora: "cora@eastgate.example",
  consultant: "dev.consultant@advisory.example",
  outsider: "outsider@random.example",
} as const;

export const admin = createClient(url, service, { auth: { persistSession: false } });

/** Signs in through the real email-OTP flow (code fetched via the admin API instead of the inbox). */
export async function signIn(email: string, activeOrg?: string): Promise<SupabaseClient> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: vErr } = await client.auth.verifyOtp({ email, token: data.properties.email_otp, type: "email" });
  if (vErr) throw vErr;
  if (activeOrg) {
    const { error: wErr } = await client.rpc("set_active_org", { p_org: activeOrg });
    if (wErr) throw wErr;
  }
  return client;
}

export const anonClient = () => createClient(url, anon, { auth: { persistSession: false } });

export const validFields = (title = "Seasonal pattern observed in SME cash flow") => ({
  type: "market_observation",
  offering: "Financial Analysis Intelligence",
  industry: "SME lending",
  region: "Pune district",
  period_start: "2026-07-01",
  period_end: "2026-09-30",
  evidence_type: "anecdotal",
  confidence: "low",
  title,
  body: "A synthetic observation used by automated tests to verify the governed learning workflow.",
});
