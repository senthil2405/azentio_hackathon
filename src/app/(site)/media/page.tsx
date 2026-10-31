import type { Metadata } from "next";
import { MediaPage } from "@/components/sites/azentio/pages/MediaPage";

export const metadata: Metadata = { title: "Media & Videos" };

export default function Page() {
  return <MediaPage />;
}
