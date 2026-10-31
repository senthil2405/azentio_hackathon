import type { Metadata } from "next";
import { SmeCreditDecisioningPage } from "@/components/sites/azentio/pages/SmeCreditDecisioningPage";

export const metadata: Metadata = { title: "SME Credit Decisioning Workbench" };

export default function Page() {
  return <SmeCreditDecisioningPage />;
}
