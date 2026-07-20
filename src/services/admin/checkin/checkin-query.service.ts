import adminApi from "@/lib/admin/api";

import type {
  TripCheckinPassengersResponse,
  TripPassengerFilter,
  UpcomingCheckinTripsResponse,
} from "@/types/admin/checkin/checkin-operation.type";

interface GetUpcomingTripsParams {
  hours?: number;
  limit?: number;
}

interface GetTripPassengersParams {
  tripId: number;
  filter?: TripPassengerFilter;
  keyword?: string;
}

export async function getUpcomingCheckinTripsApi(
  params: GetUpcomingTripsParams = {},
): Promise<UpcomingCheckinTripsResponse> {
  const response = await adminApi.get<UpcomingCheckinTripsResponse>(
    "/admin/checkins/upcoming-trips",
    {
      params: {
        hours: params.hours ?? 24,

        limit: params.limit ?? 30,
      },
    },
  );

  return response.data;
}

export async function getTripCheckinPassengersApi(
  params: GetTripPassengersParams,
): Promise<TripCheckinPassengersResponse> {
  const response = await adminApi.get<TripCheckinPassengersResponse>(
    `/admin/checkins/trips/${params.tripId}/passengers`,
    {
      params: {
        filter: params.filter ?? "ALL",

        keyword: params.keyword?.trim() ?? "",
      },
    },
  );

  return response.data;
}
