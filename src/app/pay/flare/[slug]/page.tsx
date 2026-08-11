import { permanentRedirect } from "next/navigation";

export default async function LegacyFlareCheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  permanentRedirect(`/pay/${slug}`);
}