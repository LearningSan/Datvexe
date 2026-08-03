import { useMutation, useQuery } from "@tanstack/react-query";

import {
  fetchBookingPaymentSummary,
  createPayment,
  fetchPaymentStatus,
  cancelPaymentHold,
  updatePaymentMethodApi,
  confirmManualPayment,
  findBookingIds,
} from "@/services/client/payment.service";

import { usePaymentStore } from "@/store/payment.store";

import type {
  CancelHoldPayload,
  CreatePaymentPayload,
  PaymentStatus,
  UpdatePaymentMethodPayload,
  BookingGroupResponse,
} from "@/types/client/payment/payment.type";

const FINAL_PAYMENT_STATUSES: PaymentStatus[] = [
  "PAID",
  "FAILED",
  "REJECTED",
  "EXPIRED",
  "REFUNDED",
];

export function useBookingSummary(bookingIds: number[]) {
  return useQuery({
    queryKey: ["booking-payment-summary", bookingIds],

    queryFn: () => fetchBookingPaymentSummary(bookingIds),

    enabled: Array.isArray(bookingIds) && bookingIds.length > 0,

    refetchOnWindowFocus: false,
    refetchOnReconnect: true,

    refetchOnMount: true,

    staleTime: 30_000,

    gcTime: 1000 * 60 * 5,

    retry: 1,

    throwOnError: false,
  });
}

export function useCreatePayment() {
  const setPaymentResult = usePaymentStore((state) => state.setPaymentResult);

  const setStep = usePaymentStore((state) => state.setStep);

  return useMutation({
    mutationKey: ["create-payment"],

    mutationFn: (payload: CreatePaymentPayload) => createPayment(payload),

    onSuccess: (data) => {
      setPaymentResult(data);

      if (data.status === "PAID") {
        setStep("success");
        return;
      }

      if (data.status === "FAILED" || data.status === "REJECTED") {
        setStep("failed");
        return;
      }

      if (data.status === "EXPIRED") {
        setStep("expired");
        return;
      }

      setStep("checkout");
    },

    onError: () => {
      setStep("checkout");
    },

    retry: false,
    throwOnError: false,
  });
}

export function useUpdatePaymentMethod() {
  const setPaymentResult = usePaymentStore((state) => state.setPaymentResult);

  const setStep = usePaymentStore((state) => state.setStep);

  return useMutation({
    mutationKey: ["update-payment-method"],

    mutationFn: (payload: UpdatePaymentMethodPayload) =>
      updatePaymentMethodApi(payload),

    onSuccess: (data) => {
      setPaymentResult(data);

      if (data.status === "PAID") {
        setStep("success");
        return;
      }

      if (data.status === "FAILED" || data.status === "REJECTED") {
        setStep("failed");
        return;
      }

      if (data.status === "EXPIRED") {
        setStep("expired");
        return;
      }

      setStep("checkout");
    },

    onError: () => {
      setStep("checkout");
    },

    retry: false,
    throwOnError: false,
  });
}

export function useConfirmManualPayment() {
  return useMutation({
    mutationKey: ["confirm-manual-payment"],

    mutationFn: (payload: { paymentId: number; note?: string }) =>
      confirmManualPayment(payload),

    retry: false,
    throwOnError: false,
  });
}

export function useCancelHold() {
  return useMutation({
    mutationKey: ["cancel-payment-hold"],

    mutationFn: (payload: CancelHoldPayload) => cancelPaymentHold(payload),

    retry: 1,
    throwOnError: false,
  });
}

export function usePaymentStatus(paymentId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["payment-status", paymentId],

    queryFn: () => {
      if (!paymentId || !Number.isInteger(paymentId) || paymentId <= 0) {
        throw new Error("paymentId không hợp lệ");
      }

      return fetchPaymentStatus(paymentId);
    },

    enabled: Number.isInteger(paymentId) && Number(paymentId) > 0 && enabled,

    meta: {
      globalLoading: false,
    },

    refetchInterval: (query) => {
      const status = query.state.data?.status;

      if (status && FINAL_PAYMENT_STATUSES.includes(status)) {
        return false;
      }

      return 2_000;
    },

    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,

    refetchOnMount: true,

    retry: false,

    staleTime: 0,
    gcTime: 1000 * 60 * 5,

    throwOnError: false,
  });
}
export function useBookingGroup(bookingGroupId: number) {
  return useQuery({
    queryKey: ["booking-group", bookingGroupId],

    queryFn: () => findBookingIds(bookingGroupId),

    enabled: Number.isInteger(bookingGroupId) && bookingGroupId > 0,

    staleTime: 30_000,

    gcTime: 1000 * 60 * 5,

    retry: 1,

    throwOnError: false,
  });
}
