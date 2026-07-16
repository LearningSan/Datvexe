import { z } from "zod";

export const adminCashPaymentStatusSchema = z.enum([
  "PENDING",
  "WAITING_CONFIRM",
  "PAID",
  "EXPIRED",
]);

export const adminCashPaymentListQuerySchema = z.object({
  keyword: z.string().trim().optional().default(""),

  status: adminCashPaymentStatusSchema.optional(),

  page: z.coerce.number().int().positive().optional().default(1),

  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export const lookupCashPaymentSchema = z.object({
  transactionCode: z
    .string()
    .trim()
    .min(1, "Mã giao dịch không được để trống")
    .max(120, "Mã giao dịch không hợp lệ")
    .transform((value) =>
      value.startsWith("CASH:") ? value.slice(5).trim() : value,
    ),
});

export const confirmCashPaymentSchema = lookupCashPaymentSchema.extend({
  note: z.string().trim().max(255).optional(),
});
