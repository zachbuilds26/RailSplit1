import type { Metadata } from "next";
import { DashboardRailOverview } from "@/components/dashboard/dashboard-rail-overview";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <DashboardRailOverview />;
}
