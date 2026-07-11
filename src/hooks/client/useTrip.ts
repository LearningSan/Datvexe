import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchTrips,
  fetchTripFilterOptions,
} from "@/services/client/trip.service";

import type { TripSearchFilters } from "@/types/client/trip/trip-filter.type";
import type { SearchTripsResponse } from "@/types/client/trip/trip-response.type";

export function useTripSearch(filters: TripSearchFilters) {
  const canSearch =
    !!filters.originCityId && !!filters.destinationCityId && !!filters.date;

  const query = useQuery<SearchTripsResponse>({
    queryKey: [
      "trips",
      filters.originCityId,
      filters.destinationCityId,
      filters.date,
      filters.page,
      filters.limit,
      filters.sort.field,
      filters.sort.order,
      filters.onlyAvailable,
      filters.timeSlots,
      filters.vehicleTypes,
      filters.seatPositions,
      filters.floors,
    ],

    queryFn: () => fetchTrips(filters),
    enabled: canSearch,

    placeholderData: keepPreviousData,
    meta: {
      globalLoading: false,
    },

    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,

    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,

    retry: 1,
    throwOnError: false,
  });

  return {
    trips: query.data?.trips ?? [],
    pagination: query.data?.pagination ?? null,

    isLoading: query.isPending,
    isFetching: query.isFetching,

    isError: query.isError,
    error: query.error,

    refetch: query.refetch,
  };
}

export function useTripFilterOptions(filters: {
  origin?: number;
  destination?: number;
  date?: string;
}) {
  return useQuery({
    queryKey: [
      "trip-filter-options",
      filters.origin,
      filters.destination,
      filters.date,
    ],

    queryFn: () =>
      fetchTripFilterOptions({
        origin: Number(filters.origin),
        destination: Number(filters.destination),
        date: String(filters.date),
      }),

    enabled: !!filters.origin && !!filters.destination && !!filters.date,

    /**
     * Sidebar tự xử lý skeleton và lỗi riêng.
     */
    meta: {
      globalLoading: false,
    },

    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,

    refetchOnWindowFocus: false,
    refetchOnReconnect: true,

    retry: 1,
    throwOnError: false,
  });
}
