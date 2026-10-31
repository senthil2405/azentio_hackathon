# DESIGN.md: azentio.ai website + portal

Extracted from the reference prototype (`src/app/(site)/site.css`). Public pages use that CSS verbatim. Portal pages (`src/app/(app)`) use Tailwind/shadcn **mapped to these same tokens**, so the two feel like one product.

## 1. Colour
| Token | Value | Use |
|---|---|---|
| `--bg` / navy | `#171b3a` | Header, hero, dark sections, portal sidebar |
| `--green` | `#69D393` | Primary action, accents, active nav, focus on dark |
| green-ink | `#247447` | Eyebrows and focus outlines on light backgrounds (AA contrast on white) |
| `--ink` | `#102031` | Body text |
| `--muted` | `#607080` | Secondary text |
| `--light` | `#f5f7f9` | Muted section background, portal canvas |
| border | `#dde3ed` | Cards, inputs, dividers |
| danger | `#b42318` | Destructive actions, rejected state |
| warning | `#b54708` | Sensitive-content flags, small-sample warnings |

The palette is navy + one green, so colour does not encode meaning by itself: every status also has a text label.

## 2. Typography
- Family: **Arial, Helvetica, sans-serif** (as in the source; no web font, so zero font loading cost).
- Display: 45–99 px, `letter-spacing: -2px…-4px`, line-height 1.02. H2 sections ~40–52 px. Body 15–20 px, line-height 1.6–1.7.
- **Eyebrow:** 11 px, weight 800, `letter-spacing: 2.2px`, uppercase copy, green-ink (green on dark).
- Portal: H1 28 px / H2 20 px / body 14–15 px, tighter tracking (-0.5 px) on headings.

## 3. Layout and shape
- Container `min(1180px, 100% − 48px)`. Sections pad ~90–110 px vertically on public pages and 24–32 px in the portal.
- Radius: buttons 5 px, cards 8–10 px, pills 999 px. Shadow: `0 10px 28px #171b3a24` (cards, menus).
- Header: 76 px, sticky, navy, bottom border `#ffffff16`.

## 4. Components
- **Button:** green fill, `#122015` text, 700 weight, hover `translateY(-2px)`. Outline variant on dark: white text, `#ffffff6e` border.
- **Card:** white, 1 px border `#dde3ed`, radius 8 px, 24 px padding; eyebrow + title + body + link-arrow.
- **Portal shell:** navy left sidebar (logo, workspace switcher, nav), light canvas, white cards. The active org is always visible at top-left of the sidebar.
- **Status chip** (contribution): Draft (grey) · Shared in org (navy outline) · Submitted (blue-grey) · Returned (warning) · Published (green) · Under review (warning outline) · Rejected/Removed (danger outline) · Withdrawn (grey strike). Always text plus colour.
- **Idea status chip:** Proposed · Under review · Planned · In progress · Released · Not proceeding.
- **Audience badge** (required on every portal record): an eye icon plus plain words: "Only you" · "Your organisation" · "Shared learning community" · "Azentio employees" · "Public".
- **Synthetic label:** a dashed warning-colour border reading "Synthetic data · simulated output · not a credit decision", shown on every Playground and sandbox output.
- **Small-sample banner:** warning tone: "Fewer than N organisations contributed. Counts hidden; treat as anecdotal."
- **Empty state:** icon + one sentence + the next action. Never sample data from another tenant.

## 5. Motion
CSS only: 200 ms colour/transform transitions, 550 ms card flip. All motion is disabled under `prefers-reduced-motion`. No intro splash (the prototype's "activation" screen is omitted for load performance).

## 6. Accessibility (WCAG 2.2 AA)
- Visible focus: 3 px outline (green-ink on light, green on dark), offset 2–4 px.
- Targets ≥ 24×24 px. Labels for every input. Errors in text, linked with `aria-describedby`.
- Dialogs trap focus and close on Escape. The AIRA panel is `role="dialog"` with an `aria-live` log.
- Contrast: never `#607080` on `#f5f7f9` below 14 px bold.

## 7. Don'ts
- No purple/blue gradients, no extra accent colours, no icon tiles above every heading.
- Don't hide audience or state behind hover; it must be visible at rest.
- Don't use colour alone for status. Don't show counts that the server suppressed.
