import type { Metadata } from "next";
import { ConnectPage } from "@/components/sites/azentio/pages/ConnectPage";

export const metadata: Metadata = { title: "Request a demo" };

export default function Page() {
  return <ConnectPage />;
}
