import TripInfoPage from "@/components/client/trip/tripInfo/TripInfoPage";

interface Props {
  params: Promise<{
    tripId: string;
  }>;
}

export default async function ShuttlePage({ params }: Props) {
  const { tripId } = await params;

  return <TripInfoPage tripId={tripId} type="shuttle" />;
}
