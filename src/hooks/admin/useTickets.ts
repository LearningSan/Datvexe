import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addAdminTicketSeatsApi,
  cancelAdminTicketApi,
  cancelAdminTicketHoldApi,
  changeAdminTicketSeatsApi,
  checkinAdminTicketApi,
  checkinAdminTicketSeatApi,
  createAdminOfflineTicketApi,
  extendAdminTicketHoldApi,
  fetchAdminTicketDetail,
  fetchAdminTicketOptions,
  fetchAdminTickets,
  fetchAdminTicketWarnings,
  removeAdminTicketSeatApi,
  resendAdminTicketApi,
  syncAdminTicketTripSeatsApi,
  updateAdminTicketPickupDropoffApi,
  updateAdminTicketStatusApi,
  searchAdminTicketForCheckinApi,
  fetchCancelAdminTicketPreviewApi,
  fetchChangeAdminTicketPreviewApi,
  changeAdminTicketTripApi,
  undoCheckinAdminTicketApi,
  undoCheckinAdminTicketSeatApi,
  fetchAdminTripPassengerListApi,
  fetchAdminTripSeatListApi,
  fetchAdminTicketAvailableSeatsApi,
  resendAdminTicketWithResultApi,
  fetchAdminOfflineTicketPreviewApi,
} from "@/services/admin/ticket.service";
import type {
  AdminTicketListParams,
  AddTicketSeatsPayload,
  CancelTicketPayload,
  ChangeTicketSeatsPayload,
  ChangeTicketTripPayload,
  CreateOfflineTicketPayload,
  ExtendTicketHoldPayload,
  UpdatePickupDropoffPayload,
  UpdateTicketStatusPayload,
} from "@/types/admin/tickets/ticket-management.type";

export function useAdminTickets(params: AdminTicketListParams) {
  return useQuery({
    queryKey: ["admin-tickets", params],
    queryFn: () => fetchAdminTickets(params),
  });
}

export function useAdminTicketOptions() {
  return useQuery({
    queryKey: ["admin-ticket-options"],
    queryFn: fetchAdminTicketOptions,
  });
}

export function useAdminTicketWarnings() {
  return useQuery({
    queryKey: ["admin-ticket-warnings"],
    queryFn: fetchAdminTicketWarnings,
  });
}

export function useAdminTicketDetail(bookingId?: number | null) {
  return useQuery({
    queryKey: ["admin-ticket-detail", bookingId],
    queryFn: () => fetchAdminTicketDetail(Number(bookingId)),
    enabled: !!bookingId,
  });
}

function invalidateTickets(
  qc: ReturnType<typeof useQueryClient>,
  bookingId?: number,
) {
  qc.invalidateQueries({ queryKey: ["admin-tickets"] });
  qc.invalidateQueries({ queryKey: ["admin-ticket-warnings"] });
  if (bookingId)
    qc.invalidateQueries({ queryKey: ["admin-ticket-detail", bookingId] });
}

export function useUpdateAdminTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: number;
      payload: UpdateTicketStatusPayload;
    }) => updateAdminTicketStatusApi(bookingId, payload),
    onSuccess: (_, vars) => invalidateTickets(qc, vars.bookingId),
  });
}

export function useCancelAdminTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: number;
      payload: CancelTicketPayload;
    }) => cancelAdminTicketApi(bookingId, payload),
    onSuccess: (_, vars) => invalidateTickets(qc, vars.bookingId),
  });
}

export function useExtendAdminTicketHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: number;
      payload: ExtendTicketHoldPayload;
    }) => extendAdminTicketHoldApi(bookingId, payload),
    onSuccess: (_, vars) => invalidateTickets(qc, vars.bookingId),
  });
}

export function useCancelAdminTicketHold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) => cancelAdminTicketHoldApi(bookingId),
    onSuccess: (_, bookingId) => invalidateTickets(qc, bookingId),
  });
}

export function useAddAdminTicketSeats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: number;
      payload: AddTicketSeatsPayload;
    }) => addAdminTicketSeatsApi(bookingId, payload),
    onSuccess: (_, vars) => invalidateTickets(qc, vars.bookingId),
  });
}

export function useChangeAdminTicketSeats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: number;
      payload: ChangeTicketSeatsPayload;
    }) => changeAdminTicketSeatsApi(bookingId, payload),
    onSuccess: (_, vars) => invalidateTickets(qc, vars.bookingId),
  });
}

export function useRemoveAdminTicketSeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      bookingSeatId,
    }: {
      bookingId: number;
      bookingSeatId: number;
    }) => removeAdminTicketSeatApi(bookingId, bookingSeatId),
    onSuccess: (_, vars) => invalidateTickets(qc, vars.bookingId),
  });
}

export function useSyncAdminTicketTripSeats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) => syncAdminTicketTripSeatsApi(bookingId),
    onSuccess: (_, bookingId) => invalidateTickets(qc, bookingId),
  });
}

export function useUpdateAdminTicketPickupDropoff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: number;
      payload: UpdatePickupDropoffPayload;
    }) => updateAdminTicketPickupDropoffApi(bookingId, payload),
    onSuccess: (_, vars) => invalidateTickets(qc, vars.bookingId),
  });
}

export function useCheckinAdminTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) => checkinAdminTicketApi(bookingId),
    onSuccess: (_, bookingId) => invalidateTickets(qc, bookingId),
  });
}

export function useCheckinAdminTicketSeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      bookingSeatId,
    }: {
      bookingId: number;
      bookingSeatId: number;
    }) => checkinAdminTicketSeatApi(bookingId, bookingSeatId),
    onSuccess: (_, vars) => invalidateTickets(qc, vars.bookingId),
  });
}

export function useCreateAdminOfflineTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOfflineTicketPayload) =>
      createAdminOfflineTicketApi(payload),
    onSuccess: () => invalidateTickets(qc),
  });
}

export function useResendAdminTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) => resendAdminTicketApi(bookingId),
    onSuccess: (_, bookingId) => invalidateTickets(qc, bookingId),
  });
}

export function useSearchAdminTicketForCheckin() {
  return useMutation({
    mutationFn: (bookingCode: string) =>
      searchAdminTicketForCheckinApi(bookingCode),
  });
}

export function useCancelAdminTicketPreview(bookingId?: number | null) {
  return useQuery({
    queryKey: ["admin-ticket-cancel-preview", bookingId],
    queryFn: () => fetchCancelAdminTicketPreviewApi(Number(bookingId)),
    enabled: !!bookingId,
  });
}

export function useChangeAdminTicketPreview(
  bookingId?: number | null,
  params?: {
    newTripId?: number;
    newSeatLayoutDetailIds?: number[];
    pickupPointId?: number | null;
    dropoffPointId?: number | null;
  },
) {
  return useQuery({
    queryKey: ["admin-ticket-change-preview", bookingId, params],
    queryFn: () =>
      fetchChangeAdminTicketPreviewApi(Number(bookingId), params || {}),
    enabled: !!bookingId,
  });
}

export function useChangeAdminTicketTrip() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingId,
      payload,
    }: {
      bookingId: number;
      payload: ChangeTicketTripPayload;
    }) => changeAdminTicketTripApi(bookingId, payload),

    onSuccess: (_, vars) => {
      invalidateTickets(qc, vars.bookingId);
      qc.invalidateQueries({ queryKey: ["admin-ticket-change-preview"] });
      qc.invalidateQueries({ queryKey: ["admin-trip-seat-list"] });
      qc.invalidateQueries({ queryKey: ["admin-trip-passenger-list"] });
    },
  });
}

export function useUndoCheckinAdminTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) => undoCheckinAdminTicketApi(bookingId),
    onSuccess: (_, bookingId) => invalidateTickets(qc, bookingId),
  });
}

export function useUndoCheckinAdminTicketSeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      bookingSeatId,
    }: {
      bookingId: number;
      bookingSeatId: number;
    }) => undoCheckinAdminTicketSeatApi(bookingId, bookingSeatId),
    onSuccess: (_, vars) => invalidateTickets(qc, vars.bookingId),
  });
}

export function useAdminTripPassengerList(tripId?: number | null) {
  return useQuery({
    queryKey: ["admin-trip-passenger-list", tripId],
    queryFn: () => fetchAdminTripPassengerListApi(Number(tripId)),
    enabled: !!tripId,
  });
}

export function useAdminTripSeatList(tripId?: number | null) {
  return useQuery({
    queryKey: ["admin-trip-seat-list", tripId],
    queryFn: () => fetchAdminTripSeatListApi(Number(tripId)),
    enabled: !!tripId,
  });
}

export function useAdminTicketAvailableSeats(bookingId?: number | null) {
  return useQuery({
    queryKey: ["admin-ticket-available-seats", bookingId],
    queryFn: () => fetchAdminTicketAvailableSeatsApi(Number(bookingId)),
    enabled: !!bookingId,
  });
}

export function useResendAdminTicketWithResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) =>
      resendAdminTicketWithResultApi(bookingId),
    onSuccess: (_, bookingId) => invalidateTickets(qc, bookingId),
  });
}
export function useAdminOfflineTicketPreview(tripId?: number | null) {
  return useQuery({
    queryKey: ["admin-offline-ticket-preview", tripId],
    queryFn: () => fetchAdminOfflineTicketPreviewApi(Number(tripId)),
    enabled: !!tripId,
  });
}
