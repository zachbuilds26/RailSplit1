import type { Metadata } from "next";
import { XrpDashboardOverview } from "@/components/xrp/xrp-dashboard-overview";

export const metadata: Metadata = {
  title: "XRP Dashboard",
};

export default function XrpDashboardPage() {
  return <XrpDashboardOverview />;
}
