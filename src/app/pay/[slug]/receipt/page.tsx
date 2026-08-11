import type { Metadata } from "next";
import { ReceiptExperience } from "@/components/checkout/receipt-experience";

export const metadata: Metadata = {
  title: "Receipt",
};

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tx?: string | string[] }>;
}) {
  const { slug } = await params;
  const { tx } = await searchParams;

  const txHash =
    typeof tx === "string" && /^0x[0-9a-fA-F]{64}$/.test(tx) ? (tx as `0x${string}`) : undefined;

  return <ReceiptExperience slug={slug} txHash={txHash} />;
}
