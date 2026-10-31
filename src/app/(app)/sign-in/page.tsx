import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/portal/ui";
import { safeNext } from "@/server/auth/next-path";
import { SignInForm } from "./SignInForm";

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
        <p className="mt-6 text-center text-xs text-[#b5c5d0]">
          New client? Access is by invitation from your organisation administrator.
        </p>
      </div>
    </main>
  );
}
