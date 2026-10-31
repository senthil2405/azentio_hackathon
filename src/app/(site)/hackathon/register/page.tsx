import type { Metadata } from "next";
import { HackathonRegisterPage } from "@/components/sites/azentio/pages/HackathonRegisterPage";

export const metadata: Metadata = { title: "Hackathon registration" };

export default function Page() {
  return <HackathonRegisterPage />;
}
