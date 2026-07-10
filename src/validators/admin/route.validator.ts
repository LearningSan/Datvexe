import { z } from "zod";

export const adminRouteListQuerySchema = z.object({
  keyword: z.string().optional().default(""),
  originCityId: z.coerce.number().optional(),
  destinationCityId: z.coerce.number().optional(),
  status: z
    .enum(["ACTIVE", "SUSPENDED", "NO_SCHEDULE", "MISSING_CONFIG"])
    .optional(),
  sort: z
    .enum(["NEWEST", "OLDEST", "REVENUE_DESC", "BOOKING_DESC"])
    .optional()
    .default("NEWEST"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export const createAdminRouteSchema = z
  .object({
    originCityId: z.coerce.number().min(1, "Vui lòng chọn điểm đi"),
    destinationCityId: z.coerce.number().min(1, "Vui lòng chọn điểm đến"),
    originHubId: z.coerce.number().optional().nullable(),
    destinationHubId: z.coerce.number().optional().nullable(),
    distanceKm: z.coerce.number().positive("Khoảng cách phải lớn hơn 0"),
    estimatedDuration: z.coerce.number().positive("Thời gian phải lớn hơn 0"),
    basePrice: z.coerce.number().positive("Giá cơ bản phải lớn hơn 0"),
    status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
  })
  .refine((data) => data.originCityId !== data.destinationCityId, {
    message: "Điểm đi và điểm đến không được trùng nhau",
    path: ["destinationCityId"],
  });

export const updateAdminRouteSchema = createAdminRouteSchema.extend({
  reason: z.string().min(3, "Vui lòng nhập lý do chỉnh sửa").optional(),
});

export const updateAdminRouteStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().min(3, "Vui lòng nhập lý do thay đổi trạng thái"),
});
