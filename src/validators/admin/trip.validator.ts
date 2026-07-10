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
  vehicleId: z.coerce.number().int().positive().optional().nullable(),
  departureDatetime: z.string().min(1, "Thời gian khởi hành không hợp lệ"),
  arrivalDatetime: z.string().min(1, "Thời gian đến không hợp lệ"),
  availableSeats: z.coerce.number().int().positive("Số ghế không hợp lệ"),
  driverId: z.coerce.number().int().positive().nullable().optional(),
});

export const updateAdminTripSchema = z.object({
  vehicleId: z.coerce.number().int().positive().optional().nullable(),
  departureDatetime: z.string().min(1, "Thời gian khởi hành không hợp lệ"),
  arrivalDatetime: z.string().min(1, "Thời gian đến không hợp lệ"),
  status: tripStatusSchema,
  driverId: z.coerce.number().int().positive().nullable().optional(),
});

export const updateTripStatusSchema = z.object({
  status: tripStatusSchema,
  reason: z.string().trim().optional(),
});

export const tripIdParamsSchema = z.object({
  tripId: z.coerce.number().int().positive("tripId không hợp lệ"),
});
export const copyTripsSchema = z.object({
  sourceDate: z.string().min(1, "Ngày nguồn không hợp lệ"),
  targetDateFrom: z.string().min(1, "Vui lòng chọn ngày bắt đầu"),
  targetDateTo: z.string().min(1, "Vui lòng chọn ngày kết thúc"),
  routeId: z.coerce.number().int().positive().optional(),
  keepVehicle: z.boolean(),
  keepPrice: z.boolean(),
  overwriteExisting: z.boolean().default(false),
});
export const bulkUpdateTripPriceSchema = z.object({
  routeId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().min(1, "Ngày bắt đầu không hợp lệ"),
  dateTo: z.string().min(1, "Ngày kết thúc không hợp lệ"),
  priceMode: z.enum(["FIXED", "PERCENT"]),
  priceValue: z.coerce.number().positive("Giá trị cập nhật không hợp lệ"),
});
