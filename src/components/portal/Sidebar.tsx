import Link from "next/link";
import { BookOpen, Building2, ClipboardCheck, FlaskConical, Gauge, Lightbulb, LogOut, MessagesSquare, Radio, Users } from "lucide-react";
import { authorize, isEmployee, type Principal } from "@/server/authz/policy";
import { switchWorkspace } from "@/server/portal/workspace-actions";

type Item = { href: string; label: string; icon: React.ReactNode; show: boolean };

export function Sidebar({ principal, unread }: { principal: Principal; unread: number }) {
  const active = principal.memberships.find((m) => m.orgId === principal.activeOrgId);
  const can = (a: Parameters<typeof authorize>[1]) => authorize(principal, a).allowed;
  const items: Item[] = [
    { href: "/portal", label: "Dashboard", icon: <Gauge />, show: true },
    { href: "/portal/contributions", label: "My observations", icon: <MessagesSquare />, show: can("learning.contribute") },
    { href: "/portal/learning", label: "Shared learning", icon: <BookOpen />, show: can("learning.read") },
    { href: "/portal/insights", label: "Themes & ideas", icon: <Lightbulb />, show: can("learning.read") },
    { href: "/portal/moderation", label: "Moderation", icon: <ClipboardCheck />, show: can("moderation") },
    { href: "/portal/playground", label: isEmployee(principal) ? "Playground" : "Sandboxes", icon: <FlaskConical />, show: can("employee.area") || can("client.area") },
    { href: "/portal/live", label: "Live & recordings", icon: <Radio />, show: can("employee.area") },
    { href: "/portal/members", label: "Members & invitations", icon: <Users />, show: can("client.admin") },
  ];
  return (
    <aside className="flex w-full shrink-0 flex-col bg-sidebar text-sidebar-foreground md:min-h-screen md:w-64">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Link href="/" className="text-[23px] font-extrabold tracking-[-1.2px] text-white">
          a<span className="text-green">zent</span>i<span className="text-green">o.ai</span>
        </Link>
        <div className="mt-4 rounded-md bg-sidebar-accent px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[1.8px] text-[#b5c5d0] uppercase">
            <Building2 aria-hidden className="size-3" /> Active workspace
          </p>
          <p className="mt-0.5 text-sm font-bold text-white">{active?.orgName ?? "None selected"}</p>
          {principal.memberships.length > 1 && (
            <form action={switchWorkspace} className="mt-2 flex gap-2">
              <label htmlFor="org" className="sr-only">Switch workspace</label>
              <select id="org" name="org" defaultValue={principal.activeOrgId ?? ""} className="min-w-0 flex-1 rounded border border-sidebar-border bg-navy px-2 py-1 text-xs text-white">
                {principal.memberships.map((m) => (
                  <option key={m.orgId} value={m.orgId}>{m.orgName}</option>
                ))}
              </select>
              <button className="rounded bg-green px-2 text-xs font-bold text-[#122015]">Switch</button>
            </form>
          )}
        </div>
      </div>
      <nav aria-label="Portal" className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {items.filter((i) => i.show).map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-white [&_svg]:size-4 [&_svg]:text-green">
                {i.icon}
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-sidebar-border px-5 py-4 text-xs">
        <Link href="/portal/notifications" className="mb-2 block font-semibold text-white hover:text-green">
          Notifications{unread > 0 ? ` (${unread} new)` : ""}
        </Link>
        <p className="truncate text-[#b5c5d0]" title={principal.email}>{principal.email}</p>
        <form action="/auth/signout" method="post" className="mt-2">
          <button className="inline-flex items-center gap-1.5 font-semibold text-[#b5c5d0] hover:text-green">
            <LogOut aria-hidden className="size-3.5" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
