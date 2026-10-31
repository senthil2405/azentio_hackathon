/**
 * Application-layer authorization (constitution I/II). Pure and side-effect free so it can be
 * exhaustively unit-tested. Postgres RLS + SECURITY DEFINER functions enforce the same rules
 * independently; this layer decides what to render and which actions to attempt.
 */
export type Grant = "employee" | "publisher" | "moderator" | "product_owner" | "portal_admin";
export type Audience = "public" | "employees" | "org" | "community" | "author";

export type Membership = { orgId: string; orgName: string; kind: "client" | "azentio"; clientRole: "member" | "client_admin" };

export type Principal = {
  userId: string;
  email: string;
  emailVerified: boolean;
  grants: Set<Grant>;
  memberships: Membership[];
  activeOrgId: string | null;
};

export type Action =
  | "portal.enter"
  | "employee.area"
  | "client.area"
  | "client.admin"
  | "learning.read"
  | "learning.contribute"
  | "moderation"
  | "themes.manage"
  | "ideas.manage"
  | "broadcasts.manage"
  | "admin.portal"
  | "resource.read"
  | "sandbox.run";

type Context = { audience?: Audience; orgId?: string | null; entitled?: boolean };
export type Decision = { allowed: boolean; reason: string };

const EMPLOYEE_DOMAIN = "@azentio.com";
const allow = (reason: string): Decision => ({ allowed: true, reason });
const deny = (reason: string): Decision => ({ allowed: false, reason });

export function isEmployee(p: Principal | null): boolean {
  return Boolean(p && p.grants.has("employee") && p.emailVerified && p.email.toLowerCase().endsWith(EMPLOYEE_DOMAIN));
}

/** The active membership, only if the active org is one the user actually belongs to. */
export function activeMembership(p: Principal | null): Membership | null {
  if (!p?.activeOrgId) return null;
  return p.memberships.find((m) => m.orgId === p.activeOrgId) ?? null;
}

const hasGrant = (p: Principal | null, g: Grant) => isEmployee(p) && p!.grants.has(g);
const isClientMember = (p: Principal | null) => Boolean(p?.memberships.some((m) => m.kind === "client"));

export function authorize(p: Principal | null, action: Action, ctx: Context = {}): Decision {
  if (action === "resource.read" && ctx.audience === "public") return allow("public resource");
  if (!p) return deny("not signed in");

  const active = activeMembership(p);
  switch (action) {
    case "portal.enter":
      return isEmployee(p) || isClientMember(p) ? allow("member") : deny("no approved membership");
    case "employee.area":
      return isEmployee(p) ? allow("employee") : deny("not an approved employee");
    case "client.area":
    case "learning.contribute":
      return active?.kind === "client" ? allow("active client workspace") : deny("no active client workspace");
    case "client.admin":
      return active?.kind === "client" && active.clientRole === "client_admin" ? allow("client admin of active org") : deny("not client admin here");
    case "learning.read":
      return isEmployee(p) || isClientMember(p) ? allow("community reader") : deny("not a community reader");
    case "moderation":
      return hasGrant(p, "moderator") ? allow("moderator") : deny("moderator grant required");
    case "themes.manage":
      return hasGrant(p, "moderator") || hasGrant(p, "product_owner") ? allow("moderator or product owner") : deny("grant required");
    case "ideas.manage":
      return hasGrant(p, "product_owner") ? allow("product owner") : deny("product owner grant required");
    case "broadcasts.manage":
      return hasGrant(p, "publisher") ? allow("publisher") : deny("publisher grant required");
    case "admin.portal":
      return hasGrant(p, "portal_admin") ? allow("portal admin") : deny("portal admin grant required");
    case "sandbox.run":
      if (isEmployee(p)) return allow("internal sandbox");
      return active?.kind === "client" && ctx.entitled === true ? allow("entitled client") : deny("not entitled");
    case "resource.read":
      switch (ctx.audience) {
        case "employees":
          return isEmployee(p) ? allow("employee audience") : deny("employee audience");
        case "org":
          return active && ctx.orgId && active.orgId === ctx.orgId ? allow("active org") : deny("other org");
        case "community":
          return isEmployee(p) || isClientMember(p) ? allow("community") : deny("community");
        default:
          return deny("unknown or missing audience");
      }
    default:
      return deny("unknown action");
  }
}
