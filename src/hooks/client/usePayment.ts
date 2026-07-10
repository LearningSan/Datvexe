import { useMutation, useQuery, keepPreviousData } from "@tanstack/react-query";

import {
  fetchBookingPaymentSummary,
  createPayment,
  fetchPaymentStatus,
  cancelPaymentHold,
  updatePaymentMethodApi,
  confirmManualPayment,
} from "@/services/client/payment.service";

import { usePaymentStore } from "@/store/payment.store";

import type {
  CancelHoldPayload,
  CreatePaymentPayload,
  PaymentStatus,
  UpdatePaymentMethodPayload,
} from "@/types/client/payment/payment.type";

const FINAL_PAYMENT_STATUSES: PaymentStatus[] = [
  "PAID",
  "FAILED",
  "REJECTED",
  "EXPIRED",
  "REFUNDED",
];

export function useBookingSummary(bookingId: number) {
  return useQuery({
    queryKey: ["booking-payment-summary", bookingId],
    queryFn: () => fetchBookingPaymentSummary(bookingId),
    enabled: Number.isFinite(bookingId) && bookingId > 0,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useCreatePayment() {
  const setPaymentResult = usePaymentStore((s) => s.setPaymentResult);
  const setStep = usePaymentStore((s) => s.setStep);

  return useMutation({
    mutationFn: (payload: CreatePaymentPayload) => createPayment(payload),

    onSuccess: (data) => {
      setPaymentResult(data);

      if (data.status === "PAID") {
        setStep("success");
        return;
      }

      setStep("checkout");
    },

    onError: () => {
      setStep("checkout");
    },
  });
}

export function useUpdatePaymentMethod() {
  const setPaymentResult = usePaymentStore((s) => s.setPaymentResult);
  const setStep = usePaymentStore((s) => s.setStep);

  return useMutation({
    mutationFn: (payload: UpdatePaymentMethodPayload) =>
      updatePaymentMethodApi(payload),

    onSuccess: (data) => {
      setPaymentResult(data);

      if (data.status === "PAID") {
        setStep("success");
        return;
      }

      setStep("checkout");
    },

    onError: () => {
      setStep("checkout");
    },
  });
}

export function useConfirmManualPayment() {
  return useMutation({
    mutationFn: (payload: { paymentId: number; note?: string }) =>
      confirmManualPayment(payload),
  });
}

export function useCancelHold() {
  return useMutation({
    mutationFn: (payload: CancelHoldPayload) => cancelPaymentHold(payload),
    retry: 1,
  });
}

export function usePaymentStatus(paymentId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ["payment-status", paymentId],
    queryFn: () => fetchPaymentStatus(paymentId!),
    enabled: Boolean(paymentId) && enabled,

    refetchInterval: (query) => {
      const status = query.state.data?.status;

      if (status && FINAL_PAYMENT_STATUSES.includes(status)) {
        return false;
      }

      return 5000;
    },

    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: true,
    retry: 1,
    staleTime: 1000,
    gcTime: 1000 * 60 * 5,
  });
}
