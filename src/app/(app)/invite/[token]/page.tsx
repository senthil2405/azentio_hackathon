import { redirect } from "next/navigation";
import { Card } from "@/components/portal/ui";
import { getPrincipal } from "@/server/authz/principal";
import { AcceptForm } from "./AcceptForm";

export const metadata = { title: "Accept invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const principal = await getPrincipal();
  if (!principal) redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  return (
    <main className="grid min-h-screen place-items-center bg-navy px-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-2 text-2xl font-bold text-navy">Join your organisation’s workspace</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Signed in as <strong>{principal.email}</strong>. The invitation only works for the email address it was sent to, and only once.
        </p>
        <AcceptForm token={token} />
      </Card>
    </main>
  );
}
