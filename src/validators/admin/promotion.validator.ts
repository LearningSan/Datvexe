import { z } from "zod";

const dateTimeLocalSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Ngày giờ không hợp lệ");

const promotionBaseSchema = z.object({
  promoCode: z
    .string()
    .trim()
    .min(3, "Mã khuyến mãi tối thiểu 3 ký tự")
    .max(50, "Mã khuyến mãi tối đa 50 ký tự")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Mã khuyến mãi chỉ được chứa chữ, số, dấu gạch ngang và gạch dưới",
    ),

  promotionName: z
    .string()
    .trim()
    .min(2, "Tên khuyến mãi tối thiểu 2 ký tự")
    .max(100, "Tên khuyến mãi tối đa 100 ký tự"),

  discountType: z.enum(["PERCENT", "FIXED"]),

  discountValue: z.coerce.number().positive("Giá trị giảm phải lớn hơn 0"),

  minOrderAmount: z.coerce
    .number()
    .min(0, "Giá trị đơn tối thiểu không được âm"),

  startDate: dateTimeLocalSchema,

  endDate: dateTimeLocalSchema,

  usageLimit: z
    .union([
      z.coerce.number().int().positive("Giới hạn sử dụng phải lớn hơn 0"),
      z.null(),
    ])
    .optional()
    .default(null),

  bannerUrl: z.string().url("URL banner không hợp lệ").nullable().optional(),

  bannerPublicId: z.string().max(255).nullable().optional(),
});

export const adminPromotionListQuerySchema = z.object({
  keyword: z.string().optional().default(""),

  discountType: z.enum(["PERCENT", "FIXED"]).optional(),

  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const createAdminPromotionSchema = promotionBaseSchema.superRefine(
  (data, ctx) => {
    if (data.startDate >= data.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Ngày hết hạn phải sau ngày bắt đầu",
      });
    }

    if (
      data.discountType === "PERCENT" &&
      (data.discountValue <= 0 || data.discountValue > 100)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Giảm theo phần trăm phải từ 1 đến 100",
      });
    }

    if (data.discountType === "FIXED" && data.discountValue <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Số tiền giảm phải lớn hơn 0",
      });
    }
  },
);

export const updateAdminPromotionSchema = promotionBaseSchema.superRefine(
  (data, ctx) => {
    if (data.startDate >= data.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Ngày hết hạn phải sau ngày bắt đầu",
      });
    }

    if (
      data.discountType === "PERCENT" &&
      (data.discountValue <= 0 || data.discountValue > 100)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Giảm theo phần trăm phải từ 1 đến 100",
      });
    }

    if (data.discountType === "FIXED" && data.discountValue <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Số tiền giảm phải lớn hơn 0",
      });
    }
  },
);

export const updateAdminPromotionStatusSchema = z.object({
  isActive: z.boolean(),
});
