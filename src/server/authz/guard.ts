import "server-only";
import { notFound, redirect } from "next/navigation";
import { authorize, type Action } from "./policy";
import { getPrincipal } from "./principal";

/** Page/action guard. Signed-out → sign-in; signed-in but not allowed → 404 (no existence oracle). */
export async function requireAccess(action: Action, ctx?: Parameters<typeof authorize>[2], next = "/portal") {
  const principal = await getPrincipal();
  if (!principal) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (!authorize(principal, action, ctx).allowed) notFound();
  return principal;
}
