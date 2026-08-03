import PaymentContainer from "@/components/client/payment/PaymentContainer";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingIds?: string }>;
}) {
  const { bookingIds } = await searchParams;

  const ids = bookingIds?.split(",").map(Number).filter(Number.isFinite) ?? [];

  return <PaymentContainer bookingIds={ids} />;
}
