import { z } from "zod";

export const pickupPointCategorySchema = z.enum([
  "MAIN_HUB",
  "OFFICE",
  "SHUTTLE_AREA",
  "REST_STOP",
]);

export const adminPickupPointListQuerySchema = z.object({
  keyword: z.string().optional().default(""),

  cityId: z.coerce.number().int().positive().optional(),
  zoneId: z.coerce.number().int().positive().optional(),

  pointCategory: pickupPointCategorySchema.optional(),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),

  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export const createAdminPickupPointSchema = z.object({
  pointName: z.string().trim().min(2, "Tên điểm phải có ít nhất 2 ký tự"),
  address: z.string().trim().optional().nullable(),

  cityId: z.coerce.number().int().positive("Thành phố không hợp lệ"),
  zoneId: z.coerce.number().int().positive("Khu vực không hợp lệ"),

  pointCategory: pickupPointCategorySchema,

  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

export const updateAdminPickupPointSchema = createAdminPickupPointSchema;

export const updatePickupPointStatusSchema = z.object({
  isActive: z.coerce.boolean({
    message: "Trạng thái điểm không hợp lệ",
  }),
});

export const pickupPointIdParamsSchema = z.object({
  pickupPointId: z.coerce.number().int().positive("pickupPointId không hợp lệ"),
});
