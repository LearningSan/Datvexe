import { z } from "zod";

export const adminScheduleTemplateListQuerySchema = z.object({
  keyword: z.string().optional().default(""),
  routeId: z.coerce.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export const createAdminScheduleTemplateSchema = z.object({
  routeId: z.coerce.number().int().positive("Tuyến xe không hợp lệ"),
  departureTime: z.string().min(1, "Giờ khởi hành không hợp lệ"),
  estimatedDuration: z.coerce
    .number()
    .int()
    .positive("Thời lượng di chuyển phải lớn hơn 0"),
  basePrice: z.coerce.number().positive("Giá vé cơ bản phải lớn hơn 0"),
});

export const updateAdminScheduleTemplateSchema = z.object({
  departureTime: z.string().min(1, "Giờ khởi hành không hợp lệ"),
  estimatedDuration: z.coerce
    .number()
    .int()
    .positive("Thời lượng di chuyển phải lớn hơn 0"),
  basePrice: z.coerce.number().positive("Giá vé cơ bản phải lớn hơn 0"),
});

export const updateScheduleTemplateStatusSchema = z.object({
  isActive: z.boolean("Trạng thái lịch chạy không hợp lệ"),
});

export const scheduleTemplateIdParamsSchema = z.object({
  scheduleTemplateId: z.coerce
    .number()
    .int()
    .positive("scheduleTemplateId không hợp lệ"),
});
export const generateTripsFromScheduleSchema = z.object({
  scheduleTemplateId: z.coerce
    .number()
    .int()
    .positive("Lịch chạy mẫu không hợp lệ"),
  dateFrom: z.string().min(1, "Ngày bắt đầu không hợp lệ"),
  dateTo: z.string().min(1, "Ngày kết thúc không hợp lệ"),
  repeatType: z.enum(["DAILY", "WEEKLY", "WEEKDAYS", "WEEKENDS"]),
  vehicleId: z.coerce.number().int().positive().optional().nullable(),
  ticketPrice: z.coerce.number().positive().optional().nullable(),
});
