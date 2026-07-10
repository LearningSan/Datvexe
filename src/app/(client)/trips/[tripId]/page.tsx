import SeatContainer from "@/components/client/seatMap/SeatContainer";

import { getTripSeats } from "@/services/server/client/seat.service";

interface Props {
  params: Promise<{
    tripId: string;
  }>;
}

export default async function Page({ params }: Props) {
  const { tripId } = await params;

  const data = await getTripSeats(Number(tripId));

  return <SeatContainer tripId={Number(tripId)} initialData={data} />;
}
