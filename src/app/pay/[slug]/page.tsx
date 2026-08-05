import type { Metadata } from "next";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";

export const metadata: Metadata = {
  title: "Checkout",
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // The link itself is read from the contract in the browser, so this page
  // only has to hand the slug across.
  return <CheckoutExperience slug={slug} />;
}
