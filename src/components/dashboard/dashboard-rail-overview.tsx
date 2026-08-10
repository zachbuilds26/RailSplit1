"use client";

import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { useDashboardRail } from "@/components/dashboard/dashboard-rail-shell";
import { XrpDashboardOverview } from "@/components/xrp/xrp-dashboard-overview";

export function DashboardRailOverview() {
  const { railKey } = useDashboardRail();

  return railKey === "xrpl-evm-testnet"
    ? <XrpDashboardOverview key={railKey} />
    : <DashboardOverview key={railKey} />;
}
