import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PaymentLinkForm } from "@/components/payments/payment-link-form";
import { XrpPaymentLinkForm } from "@/components/xrp/xrp-payment-link-form";
import { isRailKey } from "@/lib/rails";

export const metadata: Metadata = {
  title: "New payment link",
};

export default async function NewPaymentLinkRailPage({
  params,
}: {
  params: Promise<{ rail: string }>;
}) {
  const { rail } = await params;

  if (!isRailKey(rail)) {
    notFound();
  }

  if (rail === "xrpl-evm-testnet") {
    return <XrpPaymentLinkForm />;
  }

  return <PaymentLinkForm />;
}
