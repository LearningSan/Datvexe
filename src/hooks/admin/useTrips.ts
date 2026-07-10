import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminTripApi,
  fetchAdminTripOptions,
  fetchAdminTrips,
  updateAdminTripApi,
  updateAdminTripStatusApi,
  bulkUpdateTripPriceApi,
  copyAdminTripsApi,
} from "@/services/admin/trip.service";

import type {
  AdminTripListParams,
  CreateAdminTripPayload,
  UpdateAdminTripPayload,
  UpdateTripStatusPayload,
  BulkUpdateTripPricePayload,
  CopyTripsPayload,
} from "@/types/admin/trips/trip-management.type";


export function useCopyTrips() {
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, CopyTripsPayload>({
    mutationFn: copyAdminTripsApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
    },
  });
}

export function useBulkUpdateTripPrice() {
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, BulkUpdateTripPricePayload>({
    mutationFn: bulkUpdateTripPriceApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
    },
  });
}
interface ApiError {
  message?: string;
  statusCode?: number;
  error?: string;
}

export function useTrips(params: AdminTripListParams) {
  return useQuery({
    queryKey: ["admin-trips", params],
    queryFn: () => fetchAdminTrips(params),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useTripOptions() {
  return useQuery({
    queryKey: ["admin-trip-options"],
    queryFn: fetchAdminTripOptions,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, CreateAdminTripPayload>({
    mutationFn: createAdminTripApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    ApiError,
    {
      tripId: number;
      payload: UpdateAdminTripPayload;
    }
  >({
    mutationFn: ({ tripId, payload }) => updateAdminTripApi(tripId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
    },
  });
}

export function useUpdateTripStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    ApiError,
    {
      tripId: number;
      payload: UpdateTripStatusPayload;
    }
  >({
    mutationFn: ({ tripId, payload }) =>
      updateAdminTripStatusApi(tripId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trips"] });
    },
  });
}
