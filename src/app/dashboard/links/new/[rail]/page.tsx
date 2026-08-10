import type { Metadata } from "next";
import { PaymentLinkForm } from "@/components/payments/payment-link-form";
import { XrpPaymentLinkForm } from "@/components/xrp/xrp-payment-link-form";

export const metadata: Metadata = {
  title: "New payment link",
};

export default async function NewPaymentLinkRailPage({
  params,
}: {
  params: Promise<{ rail: string }>;
}) {
  const { rail } = await params;

  if (rail === "xrpl-evm-testnet") {
    return <XrpPaymentLinkForm />;
  }

  return <PaymentLinkForm />;
}
