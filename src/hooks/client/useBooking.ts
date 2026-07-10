import { useMutation, useQuery } from "@tanstack/react-query";

import {
  createBooking,
  holdSeats,
  previewBooking,
  saveBookingShuttleApi,
} from "@/services/client/booking.service";

import type {
  HoldSeatsPayload,
  HoldSeatsResponse,
} from "@/types/client/payment/hold-seat.type";

interface BookingPreviewPayload {
  tripId: number;
  seatIds: number[];
  pickupPointId: number | null;
  dropoffPointId: number | null;
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: createBooking,
    retry: 0,
  });
}

export function useHoldSeats() {
  return useMutation<HoldSeatsResponse, Error, HoldSeatsPayload>({
    mutationFn: holdSeats,
  });
}

export function useBookingPreview(payload: BookingPreviewPayload) {
  return useQuery({
    queryKey: ["booking-preview", payload],
    queryFn: () => previewBooking(payload),
    enabled: payload.tripId > 0 && payload.seatIds.length > 0,
  });
}

export function useSaveBookingShuttle() {
  return useMutation({
    mutationFn: saveBookingShuttleApi,
  });
}