import { z } from "zod";

export const adminNotificationTypeSchema = z.enum([
  "BOOKING",
  "PAYMENT",
  "TRIP",
]);

export const adminNotificationListQuerySchema = z.object({
  keyword: z.string().optional().default(""),

  notificationType: adminNotificationTypeSchema.optional(),

  isRead: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const createAdminNotificationSchema = z.object({
  userId: z.coerce.number().int().positive("Người nhận không hợp lệ"),

  title: z
    .string()
    .trim()
    .min(1, "Tiêu đề không được để trống")
    .max(255, "Tiêu đề tối đa 255 ký tự"),

  content: z.string().trim().min(1, "Nội dung không được để trống"),

  notificationType: adminNotificationTypeSchema,
});

export const updateAdminNotificationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Tiêu đề không được để trống")
    .max(255, "Tiêu đề tối đa 255 ký tự"),

  content: z.string().trim().min(1, "Nội dung không được để trống"),

  notificationType: adminNotificationTypeSchema,
});
export const notificationRecipientSearchSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập từ khóa tìm kiếm")
    .max(100, "Từ khóa tìm kiếm quá dài"),
});
