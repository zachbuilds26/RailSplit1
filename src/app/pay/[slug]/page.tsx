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

  return <CheckoutExperience slug={slug} />;
}