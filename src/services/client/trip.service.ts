import api from "@/lib/client/api";
import type { TripSearchFilters } from "@/types/client/trip/trip-filter.type";

export async function fetchTrips(filters: TripSearchFilters) {
  const params = new URLSearchParams();


  params.append("origin", String(filters.originCityId));
  params.append("destination", String(filters.destinationCityId));
  params.append("date", filters.date);

  params.append("page", String(filters.page));
  params.append("limit", String(filters.limit));


  filters.timeSlots.forEach((item) => {
    params.append("timeSlots", item);
  });

  filters.vehicleTypes.forEach((item) => {
    params.append("vehicleTypes", item);
  });

  filters.seatPositions.forEach((item) => {
    params.append("seatPositions", item);
  });

  filters.floors.forEach((item) => {
    params.append("floors", item);
  });

  params.append("sort", `${filters.sort.field}_${filters.sort.order}`);

  params.append("onlyAvailable", String(filters.onlyAvailable));

  const response = await api.get(`/client/trips/search?${params.toString()}`);

  return response.data.data;
}
export async function fetchTripFilterOptions(params: {
  origin: number;
  destination: number;
  date: string;
}) {
  const res = await api.get("/client/trips/filter-options", {
    params,
  });

  return res.data.data;
}