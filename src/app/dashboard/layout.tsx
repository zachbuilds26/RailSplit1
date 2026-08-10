import { Suspense } from "react";
import { DashboardRailShell } from "@/components/dashboard/dashboard-rail-shell";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DashboardRailShell>{children}</DashboardRailShell>
    </Suspense>
  );
}
