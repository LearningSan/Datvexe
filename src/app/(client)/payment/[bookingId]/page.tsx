import PaymentContainer from "@/components/client/payment/PaymentContainer";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  return <PaymentContainer bookingId={Number(bookingId)} />;
}
