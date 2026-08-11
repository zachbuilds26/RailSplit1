import type { Metadata } from "next";
import { PaymentLinkForm } from "@/components/payments/payment-link-form";

export const metadata: Metadata = {
  title: "New payment link",
};

export default function NewPaymentLinkPage() {
  return <PaymentLinkForm />;
}