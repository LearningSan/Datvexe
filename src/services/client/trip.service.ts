import api from "@/lib/client/api";
import type { TripSearchFilters } from "@/types/client/trip/trip-filter.type";
import type { ApiResponse } from "@/types/common/api.type";
import type { SearchTripsResponse } from "@/types/client/trip/trip-response.type";
export async function fetchTrips(filters: TripSearchFilters) {
  if (!filters.originCityId || !filters.destinationCityId || !filters.date) {
    throw new Error("Thiếu thông tin tìm kiếm chuyến");
  }

  const params = new URLSearchParams();

  params.set("origin", String(filters.originCityId));
  params.set("destination", String(filters.destinationCityId));
  params.set("date", filters.date);

  params.set("requiredSeats", String(filters.requiredSeats));
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));

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

  params.set("sort", `${filters.sort.field}_${filters.sort.order}`);

  params.set("onlyAvailable", String(filters.onlyAvailable));

  const response = await api.get<ApiResponse<SearchTripsResponse>>(
    `/client/trips/search?${params.toString()}`,
  );

  return response.data.data;
}
export async function fetchTripFilterOptions(params: {
  origin: number;
  destination: number;
  date: string;
  requiredSeats: number;
}) {
  const response = await api.get("/client/trips/filter-options", {
    params,
  });

  return response.data.data;
}
