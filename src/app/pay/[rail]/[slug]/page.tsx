import type { Metadata } from "next";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { XrpCheckoutExperience } from "@/components/xrp/xrp-checkout-experience";
import { isRailKey } from "@/lib/chain";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ rail: string; slug: string }>;
}) {
  const { rail, slug } = await params;

  if (rail === "xrpl-evm-testnet") {
    return <XrpCheckoutExperience slug={slug} />;
  }

  if (!isRailKey(rail) || rail === "coston2") {
    return <CheckoutExperience slug={slug} />;
  }

  return <CheckoutExperience slug={slug} />;
}
