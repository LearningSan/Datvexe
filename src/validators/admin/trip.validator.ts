import { z } from "zod";

export const tripStatusSchema = z.enum([
  "OPEN",
  "FULL",
  "RUNNING",
  "COMPLETED",
  "CANCELLED",
]);

export const tripWarningSchema = z.enum([
  "NO_VEHICLE",
  "NO_DRIVER",
  "DEPARTING_SOON",
  "FULL_SEAT",
  "CANCELLED",
]);

export const adminTripListQuerySchema = z.object({
  keyword: z.string().optional().default(""),
  date: z.string().optional(),
  routeId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  driverId: z.coerce.number().int().positive().optional(),
  status: tripStatusSchema.optional(),
  warning: tripWarningSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export const createAdminTripSchema = z.object({
  routeId: z.coerce.number().int().positive("Tuyến xe không hợp lệ"),

  scheduleTemplateId: z.coerce
    .number()
    .int()
    .positive("Lịch chạy không hợp lệ"),

  vehicleId: z.coerce
    .number()
    .int()
    .positive("Xe không hợp lệ")
    .nullable()
    .optional(),

  driverId: z.coerce
    .number()
    .int()
    .positive("Tài xế không hợp lệ")
    .nullable()
    .optional(),

  departureDatetime: z.string().min(1, "Thời gian khởi hành không hợp lệ"),

  arrivalDatetime: z.string().min(1, "Thời gian đến không hợp lệ"),

  ticketPrice: z.coerce
    .number()
    .nonnegative("Giá vé không được âm")
    .nullable()
    .optional(),
});

export const updateAdminTripSchema = z.object({
  scheduleTemplateId: z.coerce.number().int().positive(),

  vehicleId: z.coerce.number().int().positive().nullable(),

  driverId: z.coerce.number().int().positive().nullable(),

  departureDatetime: z.string().min(1),

  arrivalDatetime: z.string().min(1),

  status: z.enum(["OPEN", "FULL", "RUNNING", "COMPLETED", "CANCELLED"]),

  ticketPrice: z.coerce.number().min(0).nullable(),
});

export const updateTripStatusSchema = z.object({
  status: tripStatusSchema,
  reason: z.string().trim().optional(),
});

export const tripIdParamsSchema = z.object({
  tripId: z.coerce.number().int().positive("tripId không hợp lệ"),
});
export const copyTripsSchema = z
  .object({
    sourceDate: z.string().date(),

    targetDateFrom: z.string().date(),

    targetDateTo: z.string().date(),

    routeId: z.number().int().positive().optional(),

    keepVehicle: z.boolean(),

    keepDriver: z.boolean(),

    keepPrice: z.boolean(),

    overwriteExisting: z.boolean(),
  })
  .refine((data) => data.targetDateFrom <= data.targetDateTo, {
    message: "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc",
    path: ["targetDateTo"],
  });
export const bulkUpdateTripPriceSchema = z.object({
  routeId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().min(1, "Ngày bắt đầu không hợp lệ"),
  dateTo: z.string().min(1, "Ngày kết thúc không hợp lệ"),
  priceMode: z.enum(["FIXED", "PERCENT"]),
  priceValue: z.coerce.number().positive("Giá trị cập nhật không hợp lệ"),
});
export const adminTripOptionsQuerySchema = z.object({
  routeId: z.coerce.number().int().positive().optional(),

  departureDatetime: z.string().min(1).optional(),

  arrivalDatetime: z.string().min(1).optional(),
});
export const availableTripResourcesSchema = z.object({
  routeId: z.coerce.number().int().positive(),
  scheduleTemplateId: z.coerce.number().int().positive(),

  departureDatetime: z.string().min(1),

  arrivalDatetime: z.string().min(1),

  tripId: z.coerce.number().int().positive().optional(),
});
