"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

type Citation = { id: string; title: string; snippet: string; href: string; meta: string };
type Message = { text: string; user?: boolean; href?: string; label?: string; citations?: Citation[] };

const GREETING: Message = {
  text: "Hi, I’m AIRA. Ask me about azentio.ai, our products, capabilities, or how to explore the website.",
};

// Public mode: answers only from published website content (same behaviour as the reference prototype).
// Signed-in, permission-filtered retrieval over approved shared learning is added in the portal (P1).
const TOPICS: { pattern: RegExp; reply: Message }[] = [
  { pattern: /\blive\b|stream|broadcast|webinar|recording/, reply: { text: "Live sessions and recordings are available to signed-in employees and invited clients.", href: "/sign-in", label: "Sign in" } },
  { pattern: /playground|sandbox|demo/, reply: { text: "Guided product sandboxes are available to employees and entitled clients. Visitors can request a demo.", href: "/connect", label: "Request a demo" } },
  { pattern: /login|log in|sign in|employee|client|portal/, reply: { text: "Employees and invited client members can sign in to their workspace.", href: "/sign-in", label: "Sign in" } },
  { pattern: /hackathon/, reply: { text: "Register your interest in the upcoming azentio.ai hackathon.", href: "/hackathon/register", label: "Register interest" } },
  { pattern: /credit strategy|simulator/, reply: { text: "Credit Strategy Simulator lets teams simulate credit policy changes before deployment.", href: "/products/credit-strategy-simulator", label: "Explore Credit Strategy Simulator" } },
  { pattern: /sme|decisioning|workbench/, reply: { text: "SME Credit Decisioning Workbench brings financial analysis, policy evaluation and credit recommendations into one workbench.", href: "/products/sme-credit-decisioning", label: "Explore the Workbench" } },
  { pattern: /similar|portfolio/, reply: { text: "Similar Portfolio Intelligence compares applications with relevant historical portfolio segments.", href: "/products/similar-portfolio-intelligence", label: "Explore Similar Portfolio Intelligence" } },
  { pattern: /riva|report/, reply: { text: "RIVA is a configurable reporting environment.", href: "/products/riva", label: "Explore RIVA" } },
  { pattern: /product|offering/, reply: { text: "Browse the azentio.ai product catalogue.", href: "/products", label: "Browse products" } },
  { pattern: /solution/, reply: { text: "See how our solutions apply intelligence to real business problems.", href: "/solutions", label: "Explore solutions" } },
  { pattern: /contact|talk|sales/, reply: { text: "Start a conversation with the azentio.ai team.", href: "/connect", label: "Contact us" } },
];

function answer(question: string): Message {
  const q = question.toLowerCase();
  return (
    TOPICS.find((t) => t.pattern.test(q))?.reply ?? {
      text: "I can help with information published on this website: products, solutions, technology, AI Lab, insights, media, and azentio.ai. I don’t have verified details beyond that content.",
      href: "/products",
      label: "Browse products",
    }
  );
}

export function Aira() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: "nearest" }), [messages]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { text, user: true }]);
    setDraft("");
    // Signed-in users get permission-filtered retrieval with citations; visitors get site-content answers.
    try {
      const res = await fetch("/api/aira", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text }) });
      if (res.ok) {
        const data = (await res.json()) as { answer: string; citations: Citation[] };
        setMessages((m) => [...m, { text: data.answer, citations: data.citations }]);
        return;
      }
    } catch {
      // fall through to public mode
    }
    setMessages((m) => [...m, answer(text)]);
  };

  return (
    <>
      <button
        className="assistant-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AIRA" : "Open AIRA"}
        aria-expanded={open}
        aria-controls="azentio-assistant"
      >
        <span className="aira-mark" aria-hidden="true">
          AIRA
        </span>
      </button>
      {open && (
        <section
          className="assistant-panel"
          id="azentio-assistant"
          role="dialog"
          aria-label="AIRA website assistant"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div className="assistant-heading">
            <strong>AIRA</strong>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={20} />
            </button>
          </div>
          <div className="assistant-messages" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={m.user ? "assistant-message user" : "assistant-message"}>
                <p>{m.text}</p>
                {m.citations?.map((c) => (
                  <Link key={c.id} href={c.href} onClick={() => setOpen(false)} style={{ display: "block", marginTop: 8 }}>
                    <strong>{c.title}</strong>
                    <span style={{ display: "block", fontSize: 12, opacity: 0.75 }}>{c.meta}</span>
                  </Link>
                ))}
                {m.href && (
                  <Link href={m.href} onClick={() => setOpen(false)}>
                    {m.label}
                  </Link>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form
            className="assistant-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
          >
            <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask AIRA…" aria-label="Message AIRA" maxLength={300} />
            <button type="submit" aria-label="Send message">
              <Send size={18} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
