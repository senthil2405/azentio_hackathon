"use client";

import { useEffect } from "react";

/**
 * Progressive enhancement for the server-rendered prototype markup:
 * mega-menu disclosures, the mobile navigation toggle and capability flip cards.
 * Uses event delegation so the ported markup stays plain server components.
 */
export function SiteInteractions() {
  useEffect(() => {
    const closeAll = (except?: Element) => {
      document.querySelectorAll<HTMLButtonElement>(".nav-disclosure[aria-expanded='true']").forEach((b) => {
        if (b === except) return;
        b.setAttribute("aria-expanded", "false");
        document.getElementById(b.getAttribute("aria-controls") ?? "")?.setAttribute("hidden", "");
      });
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const disclosure = target.closest<HTMLButtonElement>(".nav-disclosure");
      if (disclosure) {
        const panel = document.getElementById(disclosure.getAttribute("aria-controls") ?? "");
        const open = disclosure.getAttribute("aria-expanded") !== "true";
        closeAll(disclosure);
        disclosure.setAttribute("aria-expanded", String(open));
        if (open) panel?.removeAttribute("hidden");
        else panel?.setAttribute("hidden", "");
        return;
      }
      const toggle = target.closest<HTMLButtonElement>(".navigation-toggle");
      if (toggle) {
        const nav = document.getElementById("primary-navigation");
        const open = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
        nav?.classList.toggle("mobile-open", open);
        return;
      }
      const flip = target.closest<HTMLButtonElement>(".cap-flip");
      if (flip) {
        const flipped = !flip.classList.contains("is-flipped");
        flip.classList.toggle("is-flipped", flipped);
        flip.setAttribute("aria-pressed", String(flipped));
        flip.querySelector(".cap-front")?.setAttribute("aria-hidden", String(flipped));
        flip.querySelector(".cap-back")?.setAttribute("aria-hidden", String(!flipped));
        return;
      }
      if (!target.closest(".navigation-group")) closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
