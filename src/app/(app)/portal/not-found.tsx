import Link from "next/link";
import { EmptyState } from "@/components/portal/ui";

/** Shown for missing *and* unauthorized resources alike, so existence is never revealed. */
export default function PortalNotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <h1 className="mb-4 text-2xl font-bold text-navy">Not found</h1>
      <EmptyState title="This page doesn’t exist, or you don’t have access to it.">
        <Link href="/portal" className="font-semibold text-green-ink underline">Back to your dashboard</Link>
      </EmptyState>
    </div>
  );
}
