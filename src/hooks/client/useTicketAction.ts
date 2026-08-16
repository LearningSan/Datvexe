import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import {
  cancelTicket,
  previewChangeTicket,
  confirmChangeTicket,
  getCancelTicketPreview,
} from "@/services/client/ticket.service";

import type { ChangeTicketPayload } from "@/types/client/ticket/ticket.type";

// ============================================================
// HỦY VÉ
// ============================================================

export function useCancelTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: number) => cancelTicket(bookingId),

    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-history"],
      });

      queryClient.invalidateQueries({
        queryKey: ["ticket-detail", bookingId],
      });

      queryClient.invalidateQueries({
        queryKey: ["ticket-seats", bookingId],
      });

      queryClient.invalidateQueries({
        queryKey: ["trip-seats"],
      });
    },
  });
}

// ============================================================
// PREVIEW ĐỔI VÉ
// ============================================================

export function usePreviewChangeTicket() {
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: number;
      payload: ChangeTicketPayload;
    }) => previewChangeTicket(bookingId, payload),
  });
}

// ============================================================
// CONFIRM ĐỔI VÉ
// ============================================================

export function useConfirmChangeTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: number;
      payload: ChangeTicketPayload;
    }) => confirmChangeTicket(bookingId, payload),

    onSuccess: (_, variables) => {
      const {
        bookingId,
        payload: { newTripId },
      } = variables;

      queryClient.invalidateQueries({
        queryKey: ["ticket-history"],
      });

      queryClient.invalidateQueries({
        queryKey: ["ticket-detail", bookingId],
      });

      queryClient.invalidateQueries({
        queryKey: ["ticket-seats", bookingId],
      });

      queryClient.invalidateQueries({
        queryKey: ["trip-seats", newTripId],
      });

      queryClient.invalidateQueries({
        queryKey: ["trip-seats"],
      });
    },
  });
}

// ============================================================
// PREVIEW HỦY VÉ
// ============================================================

export function useCancelTicketPreview(
  bookingId: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["cancel-ticket-preview", bookingId],

    queryFn: () => getCancelTicketPreview(bookingId!),

    enabled: enabled && bookingId !== null,
  });
}
