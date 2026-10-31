import { describe, expect, it } from "vitest";
import { authorize, type Action, type Principal } from "@/server/authz/policy";

const AZ = "org-azentio";
const A = "org-a";
const B = "org-b";

const employee = (grants: string[] = [], email = "x@azentio.com"): Principal => ({
  userId: "u-emp",
  email,
  emailVerified: true,
  grants: new Set(["employee", ...grants]) as Principal["grants"],
  memberships: [{ orgId: AZ, orgName: "Azentio", kind: "azentio", clientRole: "member" }],
  activeOrgId: AZ,
});
const client = (role: "member" | "client_admin" = "member", active = A): Principal => ({
  userId: "u-cli",
  email: "c@bank.example",
  emailVerified: true,
  grants: new Set(),
  memberships: [
    { orgId: A, orgName: "A", kind: "client", clientRole: role },
    { orgId: B, orgName: "B", kind: "client", clientRole: "member" },
  ],
  activeOrgId: active,
});

const can = (p: Principal | null, a: Action) => authorize(p, a).allowed;

describe("authorize() — deny by default", () => {
  it("anonymous users can do nothing in the portal", () => {
    for (const a of ["portal.enter", "employee.area", "client.area", "learning.read", "moderation", "broadcasts.manage"] as Action[]) {
      expect(can(null, a)).toBe(false);
    }
  });

  it("employee status requires the grant AND a verified azentio.com email (never the suffix alone)", () => {
    expect(can(employee(), "employee.area")).toBe(true);
    expect(can({ ...employee(), grants: new Set() }, "employee.area")).toBe(false);
    expect(can(employee([], "x@azentio.com.evil.example"), "employee.area")).toBe(false);
    expect(can({ ...employee(), emailVerified: false }, "employee.area")).toBe(false);
  });

  it("employee does not imply any other grant", () => {
    for (const a of ["moderation", "ideas.manage", "broadcasts.manage", "admin.portal"] as Action[]) {
      expect(can(employee(), a)).toBe(false);
    }
    expect(can(employee(["moderator"]), "moderation")).toBe(true);
    expect(can(employee(["publisher"]), "broadcasts.manage")).toBe(true);
    expect(can(employee(["product_owner"]), "ideas.manage")).toBe(true);
    expect(can(employee(["portal_admin"]), "admin.portal")).toBe(true);
  });

  it("platform grants without employee status are void", () => {
    const p = { ...client(), grants: new Set(["moderator", "portal_admin"]) } as Principal;
    expect(can(p, "moderation")).toBe(false);
    expect(can(p, "admin.portal")).toBe(false);
  });

  it("client actions require an active client workspace", () => {
    expect(can(client(), "client.area")).toBe(true);
    expect(can(client(), "learning.contribute")).toBe(true);
    expect(can({ ...client(), activeOrgId: null }, "client.area")).toBe(false);
    expect(can({ ...client(), activeOrgId: "org-not-mine" }, "client.area")).toBe(false);
    expect(can(employee(), "learning.contribute")).toBe(false);
  });

  it("client admin applies only in the org where the user is admin", () => {
    expect(can(client("client_admin", A), "client.admin")).toBe(true);
    expect(can(client("client_admin", B), "client.admin")).toBe(false);
    expect(can(client("member", A), "client.admin")).toBe(false);
  });

  it("shared learning is readable by employees and client members only", () => {
    expect(can(employee(), "learning.read")).toBe(true);
    expect(can(client(), "learning.read")).toBe(true);
    expect(can({ ...client(), memberships: [] }, "learning.read")).toBe(false);
  });
});

describe("authorize() — resource audiences", () => {
  const read = (p: Principal | null, audience: string, orgId: string | null = null) =>
    authorize(p, "resource.read", { audience: audience as never, orgId }).allowed;

  it("public is explicit; missing or unknown audience is denied", () => {
    expect(read(null, "public")).toBe(true);
    expect(read(employee(), "")).toBe(false);
    expect(read(employee(), "everyone")).toBe(false);
  });
  it("employees-only content", () => {
    expect(read(employee(), "employees")).toBe(true);
    expect(read(client(), "employees")).toBe(false);
  });
  it("org content follows the active workspace", () => {
    expect(read(client("member", A), "org", A)).toBe(true);
    expect(read(client("member", B), "org", A)).toBe(false);
    expect(read(employee(), "org", A)).toBe(false);
  });
  it("author-only content is never readable through audience checks", () => {
    expect(read(client(), "author")).toBe(false);
  });
});

describe("authorize() — entitled sandboxes", () => {
  it("clients need an entitlement; employees use internal sandboxes", () => {
    expect(authorize(client(), "sandbox.run", { entitled: true }).allowed).toBe(true);
    expect(authorize(client(), "sandbox.run", { entitled: false }).allowed).toBe(false);
    expect(authorize(employee(), "sandbox.run", { entitled: false }).allowed).toBe(true);
  });
});
