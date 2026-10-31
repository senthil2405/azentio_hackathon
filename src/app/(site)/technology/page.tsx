import type { Metadata } from "next";
import { TechnologyPage } from "@/components/sites/azentio/pages/TechnologyPage";

export const metadata: Metadata = { title: "Technology" };

export default function Page() {
  return <TechnologyPage />;
}
