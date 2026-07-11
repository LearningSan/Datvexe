import { useMutation, useQuery } from "@tanstack/react-query";

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

    refetchOnWindowFocus: false,
    refetchOnReconnect: true,

    /*
     * Khi quay lại trang thanh toán, nên đọc lại booking
     * để tránh dùng trạng thái hoặc thời hạn giữ ghế cũ.
     */
    refetchOnMount: true,

    /*
     * Không dùng Infinity vì booking và holdExpiredAt
     * vẫn có thể thay đổi.
     */
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
