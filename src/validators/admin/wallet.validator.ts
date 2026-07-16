import { z } from "zod";

export const adminWalletStatusSchema = z.enum(["ACTIVE", "LOCKED"]);

export const adminWalletListQuerySchema = z.object({
  keyword: z.string().trim().optional().default(""),

  status: adminWalletStatusSchema.optional(),

  page: z.coerce.number().int().positive().optional().default(1),

  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export const adminWalletIdParamsSchema = z.object({
  walletId: z.coerce.number().int().positive("walletId không hợp lệ"),
});

export const updateAdminWalletStatusSchema = z.object({
  status: adminWalletStatusSchema,

  reason: z.string().trim().max(255).optional(),
});

export const adjustAdminWalletSchema = z.object({
  adjustmentType: z.enum(["INCREASE", "DECREASE"]),

  amount: z.coerce
    .number()
    .positive("Số tiền điều chỉnh phải lớn hơn 0")
    .max(100_000_000, "Số tiền điều chỉnh quá lớn"),

  reason: z.string().trim().min(5, "Cần nhập lý do điều chỉnh").max(255),
});
