import Link from "next/link";
import { revalidatePath } from "next/cache";
import { EmptyState, PageHeader, SubmitButton } from "@/components/portal/ui";
import { createClient } from "@/lib/supabase/server";
import { requireAccess } from "@/server/authz/guard";

export const metadata = { title: "Notifications" };

async function markAllRead() {
  "use server";
  const supabase = await createClient();
  await supabase.rpc("notifications_mark_read");
  revalidatePath("/portal", "layout");
}

export default async function NotificationsPage() {
  await requireAccess("portal.enter", undefined, "/portal/notifications");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(100);
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader eyebrow="In-app" title="Notifications">
        <form action={markAllRead}><SubmitButton variant="outline">Mark all read</SubmitButton></form>
      </PageHeader>
      <p className="text-sm text-muted-foreground">In-app notifications are stored here. Email copies are queued for delivery and are not shown as delivered unless the provider confirms it.</p>
      {!data?.length ? <EmptyState title="You’re all caught up." /> : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {data.map((n) => (
            <li key={n.id} className={n.read_at ? "px-5 py-4" : "bg-[#effaf3] px-5 py-4"}>
              <p className="font-semibold text-navy">{n.link ? <Link href={n.link} className="underline-offset-2 hover:underline">{n.title}</Link> : n.title}</p>
              {n.body && <p className="text-sm">{n.body}</p>}
              <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()} · in-app</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
