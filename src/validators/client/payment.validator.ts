import { z } from "zod";

export const paymentMethodSchema = z.enum([
  "PAYOS",
  "VNPAY",
  "MOMO",
  "ZALOPAY",
  "VIETQR",
  "INTERNAL_WALLET",
  "CASH",
]);

export const createPaymentSchema = z.object({
  bookingId: z.coerce.number().int().positive("bookingId không hợp lệ"),
  paymentMethod: paymentMethodSchema,
  sessionId: z.string().trim().min(1, "sessionId không hợp lệ"),
});

export const paymentStatusParamsSchema = z.object({
  paymentId: z.coerce.number().int().positive("paymentId không hợp lệ"),
});

export const bookingPaymentSummaryParamsSchema = z.object({
  bookingId: z.coerce.number().int().positive("bookingId không hợp lệ"),
});

export const cancelHoldSchema = z.object({
  bookingId: z.coerce.number().int().positive("bookingId không hợp lệ"),
  tripId: z.coerce.number().int().positive("tripId không hợp lệ"),
  sessionId: z.string().trim().min(1, "sessionId không hợp lệ"),
});

export const paymentWebhookSchema = z.object({
  transactionCode: z.string().trim().min(1, "transactionCode thiếu"),
  status: z.enum(["SUCCESS", "FAILED"]),
  amount: z.coerce.number().positive("amount không hợp lệ"),
  gatewayTransactionId: z.string().optional().default(""),
  gatewayResponse: z.any().optional(),
});

export const updatePaymentMethodSchema = z.object({
  paymentId: z.coerce.number().int().positive("paymentId không hợp lệ"),
  bookingId: z.coerce.number().int().positive("bookingId không hợp lệ"),
  paymentMethod: paymentMethodSchema,
  sessionId: z.string().trim().min(1, "sessionId không hợp lệ"),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
export type CancelHoldInput = z.infer<typeof cancelHoldSchema>;
export type UpdatePaymentMethodInput = z.infer<
  typeof updatePaymentMethodSchema
>;
export const manualConfirmSchema = z.object({
  note: z.string().max(255).optional(),
});
