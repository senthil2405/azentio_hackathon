import type { Metadata } from "next";
import { SolutionsPage } from "@/components/sites/azentio/pages/SolutionsPage";

export const metadata: Metadata = { title: "Solutions" };

export default function Page() {
  return <SolutionsPage />;
}
