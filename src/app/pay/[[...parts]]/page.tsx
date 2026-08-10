import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { XrpCheckoutExperience } from "@/components/xrp/xrp-checkout-experience";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ parts?: string[] }>;
}) {
  const { parts } = await params;

  if (!parts || parts.length === 0) {
    notFound();
  }

  if (parts.length === 1) {
    return <CheckoutExperience slug={parts[0]} />;
  }

  if (parts.length === 2) {
    const [rail, slug] = parts;

    if (rail === "xrpl-evm-testnet") {
      return <XrpCheckoutExperience slug={slug} />;
    }

    if (rail === "coston2") {
      return <CheckoutExperience slug={slug} />;
    }
  }

  notFound();
}
