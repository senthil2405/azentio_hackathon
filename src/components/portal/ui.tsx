import { cn } from "@/lib/utils";
import { Eye, FlaskConical, Inbox } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-lg border border-border bg-card p-6 shadow-[0_10px_28px_#171b3a0d]", className)} {...props} />;
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-extrabold tracking-[2.2px] text-green-ink uppercase">{eyebrow}</p>}
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.5px] text-navy">{title}</h1>
      </div>
      {children}
    </header>
  );
}

const field = "w-full rounded-md border border-input bg-white px-3 py-2.5 text-[15px] text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:border-ring aria-invalid:border-destructive";

export function Field({ label, hint, error, children, id }: { label: string; hint?: string; error?: string; children: ReactNode; id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-navy">
        {label}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}
export const Input = ({ className, ...p }: ComponentProps<"input">) => <input className={cn(field, className)} {...p} />;
export const Textarea = ({ className, ...p }: ComponentProps<"textarea">) => <textarea className={cn(field, "min-h-32", className)} {...p} />;
export const Select = ({ className, ...p }: ComponentProps<"select">) => <select className={cn(field, className)} {...p} />;

export function SubmitButton({ children, variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: "primary" | "outline" | "danger" }) {
  const styles = {
    primary: "bg-green text-[#122015] border-green hover:-translate-y-0.5",
    outline: "bg-white text-navy border-border hover:bg-secondary",
    danger: "bg-white text-destructive border-destructive/50 hover:bg-destructive/5",
  }[variant];
  return (
    <button className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] border px-4 py-2 text-sm font-bold transition disabled:opacity-50", styles, className)} {...p}>
      {children}
    </button>
  );
}

const AUDIENCE_LABEL: Record<string, string> = {
  author: "Only you",
  author_only: "Only you",
  org: "Your organisation",
  community: "Shared learning community",
  propose_community: "Proposed to the learning community",
  employees: "Azentio employees",
  public: "Public",
};
/** DESIGN.md §4: every portal record shows who can see it, at rest. */
export function AudienceBadge({ audience }: { audience: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-semibold text-navy">
      <Eye aria-hidden className="size-3.5" /> Visible to: {AUDIENCE_LABEL[audience] ?? "Restricted"}
    </span>
  );
}

const STATE_STYLE: Record<string, string> = {
  draft: "bg-secondary text-navy",
  org_shared: "border-navy text-navy",
  submitted: "bg-[#e7edf5] text-navy",
  returned: "bg-[#fff4e5] text-warning",
  rejected: "border-destructive/60 text-destructive",
  published: "bg-[#e3f6ea] text-green-ink",
  under_review: "border-warning text-warning",
  removed: "border-destructive/60 text-destructive",
  withdrawn: "bg-secondary text-muted-foreground line-through",
  proposed: "bg-secondary text-navy",
  planned: "bg-[#e7edf5] text-navy",
  in_progress: "bg-[#e7edf5] text-navy",
  released: "bg-[#e3f6ea] text-green-ink",
  not_proceeding: "border-border text-muted-foreground",
};
export const humanize = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
export function StatusChip({ state }: { state: string }) {
  const label = state === "org_shared" ? "Shared in org" : humanize(state);
  return <span className={cn("inline-flex rounded-full border border-transparent px-2.5 py-1 text-xs font-bold", STATE_STYLE[state])}>{label}</span>;
}

export function SyntheticLabel() {
  return (
    <p className="inline-flex items-center gap-2 rounded-md border border-dashed border-warning px-3 py-1.5 text-xs font-bold text-warning">
      <FlaskConical aria-hidden className="size-4" /> Synthetic data · simulated output · not a credit decision
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-white px-6 py-10 text-center">
      <Inbox aria-hidden className="size-6 text-muted-foreground" />
      <p className="font-semibold text-navy">{title}</p>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "success" | "error"; children: ReactNode }) {
  const styles = {
    info: "border-border bg-white text-navy",
    warning: "border-warning/40 bg-[#fff8ef] text-warning",
    success: "border-green-ink/30 bg-[#effaf3] text-green-ink",
    error: "border-destructive/40 bg-[#fef3f2] text-destructive",
  }[tone];
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-md border px-4 py-3 text-sm", styles)}>{children}</div>;
}
