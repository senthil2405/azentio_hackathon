/**
 * Demo-only persona allow-list (owner decision: judges sign in as synthetic personas because the cloud
 * mailer cannot deliver to fictional addresses). Enabled only when DEMO_MODE=on. Real users always use
 * the email-code flow.
 */
export const DEMO_PERSONAS = [
  { email: "maya.moderator@azentio.com", role: "Learning moderator (employee)" },
  { email: "priya.owner@azentio.com", role: "Product owner (employee)" },
  { email: "paul.publisher@azentio.com", role: "Publisher (employee)" },
  { email: "alex.employee@azentio.com", role: "Employee" },
  { email: "ada.admin@azentio.com", role: "Portal administrator (employee)" },
  { email: "newhire@azentio.com", role: "Unapproved @azentio.com account" },
  { email: "ana@northbank.example", role: "Client member · Northbank" },
  { email: "carl.admin@northbank.example", role: "Client administrator · Northbank" },
  { email: "bea@meridian.example", role: "Client member · Meridian" },
  { email: "cora@eastgate.example", role: "Client member · Eastgate" },
  { email: "dev.consultant@advisory.example", role: "Member of Northbank and Meridian" },
  { email: "outsider@random.example", role: "No membership" },
] as const;

export const isDemoMode = () => process.env.DEMO_MODE === "on";
export const isDemoPersona = (email: string) => DEMO_PERSONAS.some((p) => p.email === email.trim().toLowerCase());
