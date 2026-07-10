import CheckoutContainer from "@/components/client/checkout/CheckoutContainer";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <CheckoutContainer tripId={Number(tripId)} />;
}
