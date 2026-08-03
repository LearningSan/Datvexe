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
      filters.requiredSeats,
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

    isLoading: canSearch && query.isPending,
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
  requiredSeats?: number;
}) {
  const canLoad = !!filters.origin && !!filters.destination && !!filters.date;

  return useQuery({
    queryKey: [
      "trip-filter-options",
      filters.origin,
      filters.destination,
      filters.date,
      filters.requiredSeats ?? 1,
    ],

    queryFn: () =>
      fetchTripFilterOptions({
        origin: Number(filters.origin),
        destination: Number(filters.destination),
        date: String(filters.date),
        requiredSeats: filters.requiredSeats ?? 1,
      }),

    enabled: canLoad,

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
