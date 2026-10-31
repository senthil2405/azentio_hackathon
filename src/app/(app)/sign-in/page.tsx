import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/portal/ui";
import { safeNext } from "@/server/auth/next-path";
import { SignInForm } from "./SignInForm";
import { DEMO_PERSONAS, isDemoMode } from "@/server/demo/personas";
import { demoSignIn } from "@/server/demo/actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-navy px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center text-[27px] font-extrabold tracking-[-1.5px] text-white">
          a<span className="text-green">zent</span>i<span className="text-green">o.ai</span>
        </Link>
        <Card>
          <h1 className="mb-1 text-2xl font-bold text-navy">Sign in to the portal</h1>
          <p className="mb-6 text-sm text-muted-foreground">We’ll email you a one-time code. No password needed.</p>
          <SignInForm next={safeNext(next)} />
        </Card>
        {isDemoMode() && (
          <Card className="mt-6">
            <p className="mb-1 text-[11px] font-extrabold tracking-[2.2px] text-warning uppercase">Demo mode · synthetic personas only</p>
            <h2 className="mb-1 text-lg font-bold text-navy">Sign in as a demo persona</h2>
            <p className="mb-4 text-xs text-muted-foreground">For judging only. Works solely for these fictional accounts and is logged. Real users must use the email code above.</p>
            <ul className="grid gap-2">
              {DEMO_PERSONAS.map((p) => (
                <li key={p.email}>
                  <form action={demoSignIn}>
                    <input type="hidden" name="email" value={p.email} />
                    <button className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left text-sm hover:border-green-ink hover:bg-[#effaf3]">
                      <span className="font-semibold text-navy">{p.role}</span>
                      <span className="truncate text-xs text-muted-foreground">{p.email}</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <p className="mt-6 text-center text-xs text-[#b5c5d0]">
          New client? Access is by invitation from your organisation administrator.
        </p>
      </div>
    </main>
  );
}
