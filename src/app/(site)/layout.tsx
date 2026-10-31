import type { Metadata } from "next";
import "./site.css";
import { SiteHeaderMarkup } from "@/components/sites/azentio/SiteHeaderMarkup";
import { SiteFooter } from "@/components/sites/azentio/SiteFooter";
import { SiteInteractions } from "@/components/sites/azentio/SiteInteractions";
import { Aira } from "@/components/sites/azentio/Aira";

export const metadata: Metadata = {
  title: { default: "azentio.ai — Build Intelligence. Create Impact.", template: "%s · azentio.ai" },
  description: "Enterprise AI products, collaboration and governed collective learning from azentio.ai.",
};

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div id="site-content">
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <SiteHeaderMarkup />
          <main id="main-content">{children}</main>
          <SiteFooter />
        </div>
        <Aira />
        <SiteInteractions />
      </body>
    </html>
  );
}
