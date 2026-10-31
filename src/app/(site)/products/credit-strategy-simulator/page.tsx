import type { Metadata } from "next";
import { CreditStrategySimulatorPage } from "@/components/sites/azentio/pages/CreditStrategySimulatorPage";

export const metadata: Metadata = { title: "Credit Strategy Simulator" };

export default function Page() {
  return <CreditStrategySimulatorPage />;
}
