import type { Metadata } from "next";
import { ReceiptsHistory } from "@/components/checkout/receipts-history";

export const metadata: Metadata = {
  title: "My receipts",
};

export default function ReceiptsPage() {
  return <ReceiptsHistory />;
}
