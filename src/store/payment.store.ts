import { create } from "zustand";

import type {
  ManualPaymentInfo,
  PaymentFlowType,
  PaymentUiMode,
} from "@/types/client/payment/payment.type";

type PaymentStep = "checkout" | "processing" | "success" | "failed" | "expired";

interface PaymentState {
  selectedMethod: any;
  step: PaymentStep;

  paymentId: number | null;
  transactionCode: string | null;

  flowType: PaymentFlowType | null;
  uiMode: PaymentUiMode | null;
  actionText: string | null;

  qrCodeUrl: string | null;
  paymentUrl: string | null;
  deeplink: string | null;
  returnUrl: string | null;
  cancelUrl: string | null;
  manualInfo: ManualPaymentInfo | null;

  expiredAt: string | null;

  setMethod: (method: any) => void;
  setStep: (step: PaymentStep) => void;
  setExpiredAt: (expiredAt: string | null) => void;

  setPaymentResult: (data: {
    paymentId: number;
    transactionCode: string;
    flowType: PaymentFlowType;
    uiMode: PaymentUiMode;
    actionText: string | null;
    qrCodeUrl: string | null;
    paymentUrl: string | null;
    deeplink: string | null;
    returnUrl: string | null;
    cancelUrl: string | null;
    manualInfo: ManualPaymentInfo | null;
  }) => void;

  clearPaymentResult: () => void;
  reset: () => void;
}

const initial = {
  selectedMethod: "PAYOS",
  step: "checkout" as PaymentStep,

  paymentId: null,
  transactionCode: null,

  flowType: null,
  uiMode: null,
  actionText: null,

  qrCodeUrl: null,
  paymentUrl: null,
  deeplink: null,
  returnUrl: null,
  cancelUrl: null,
  manualInfo: null,

  expiredAt: null,
};

export const usePaymentStore = create<PaymentState>((set) => ({
  ...initial,

  setMethod: (method) => set({ selectedMethod: method }),
  setStep: (step) => set({ step }),
  setExpiredAt: (expiredAt) => set({ expiredAt }),

  setPaymentResult: (data) =>
    set({
      paymentId: data.paymentId,
      transactionCode: data.transactionCode,

      flowType: data.flowType,
      uiMode: data.uiMode,
      actionText: data.actionText,

      qrCodeUrl: data.qrCodeUrl,
      paymentUrl: data.paymentUrl,
      deeplink: data.deeplink,
      returnUrl: data.returnUrl,
      cancelUrl: data.cancelUrl,
      manualInfo: data.manualInfo,
    }),

  clearPaymentResult: () =>
    set({
      paymentId: null,
      transactionCode: null,
      flowType: null,
      uiMode: null,
      actionText: null,
      qrCodeUrl: null,
      paymentUrl: null,
      deeplink: null,
      returnUrl: null,
      cancelUrl: null,
      manualInfo: null,
    }),

  reset: () => set(initial),
}));
