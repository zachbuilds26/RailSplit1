import { redirect } from "next/navigation";

export default function XrpDashboardPage() {
  redirect("/dashboard?rail=xrpl-evm-testnet");
}
