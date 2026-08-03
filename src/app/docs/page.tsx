import type { Metadata } from "next";
import { DocsPage } from "@/components/docs/docs-page";

export const metadata: Metadata = {
  title: "RailSplit docs | Clear payment links on Flare",
  description:
    "RailSplit docs explain the flow, settlement, wallet views, and merchant dashboard.",
};

export default function DocsRoute() {
  return <DocsPage />;
}
