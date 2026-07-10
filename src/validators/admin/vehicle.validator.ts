import { z } from "zod";

export const vehicleStatusSchema = z.enum([
  "AVAILABLE",
  "ASSIGNED",
  "MAINTENANCE",
  "INACTIVE",
]);

export const adminVehicleListQuerySchema = z.object({
  keyword: z.string().optional().default(""),
  status: vehicleStatusSchema.optional(),
  vehicleTypeId: z.coerce.number().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
});

export const createAdminVehicleSchema = z.object({
  internalCode: z.string().min(1, "Vui lòng nhập mã xe nội bộ"),
  licensePlate: z.string().min(1, "Vui lòng nhập biển số xe"),
  vehicleName: z.string().optional().nullable(),
  vehicleTypeId: z.coerce.number().min(1, "Vui lòng chọn loại xe"),
  status: vehicleStatusSchema.default("AVAILABLE"),
  note: z.string().optional().nullable(),
});

export const updateAdminVehicleSchema = z.object({
  internalCode: z.string().min(1, "Vui lòng nhập mã xe nội bộ"),
  licensePlate: z.string().min(1, "Vui lòng nhập biển số xe"),
  vehicleName: z.string().optional().nullable(),
  vehicleTypeId: z.coerce.number().optional(),
  status: vehicleStatusSchema,
  note: z.string().optional().nullable(),
});

export const updateVehicleStatusSchema = z.object({
  status: vehicleStatusSchema,
});
