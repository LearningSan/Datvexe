import api from "@/lib/client/api";
import { ApiResponse } from "@/types/common/api.type";
import { PaymentWebhookInput } from "@/validators/client/payment.validator";

type PaymentWebhookResponse = {
  success: boolean;
};

export async function sendPaymentWebhook(payload: PaymentWebhookInput) {
  const res = await api.post<ApiResponse<PaymentWebhookResponse>>(
    "/client/payments/webhook",
    payload,
  );

  return res.data.data;
}
