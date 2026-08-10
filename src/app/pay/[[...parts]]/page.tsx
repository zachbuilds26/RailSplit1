import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { XrpCheckoutExperience } from "@/components/xrp/xrp-checkout-experience";
import { getRailByCheckoutSegment } from "@/lib/rails";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ parts?: string[] }>;
}) {
  const { parts } = await params;

  if (!parts || parts.length === 0 || parts.length > 2) {
    notFound();
  }

  if (parts.length === 1) {
    permanentRedirect(`/pay/flare/${parts[0]}`);
  }

  const [segment, slug] = parts;
  const rail = getRailByCheckoutSegment(segment);

  if (!rail) {
    notFound();
  }

  if (segment !== rail.checkoutSegment) {
    permanentRedirect(`/pay/${rail.checkoutSegment}/${slug}`);
  }

  return rail.key === "xrpl-evm-testnet"
    ? <XrpCheckoutExperience slug={slug} />
    : <CheckoutExperience slug={slug} />;
}
