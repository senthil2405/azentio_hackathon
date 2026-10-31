import type { Metadata } from "next";
import { LabPage } from "@/components/sites/azentio/pages/LabPage";

export const metadata: Metadata = { title: "AI Lab" };

export default function Page() {
  return <LabPage />;
}
