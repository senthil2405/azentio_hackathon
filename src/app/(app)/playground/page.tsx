import { redirect } from "next/navigation";

// The prototype exposed /playground publicly; it now lives behind sign-in (spec FR-016).
export default function Page() {
  redirect("/portal/playground");
}
