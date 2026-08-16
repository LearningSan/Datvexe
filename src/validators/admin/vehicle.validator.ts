import { z } from "zod";

/**
 * ============================================================
 * VEHICLE STATUS
 * ============================================================
 */

export const vehicleStatusSchema = z.enum([
  "AVAILABLE",
  "ASSIGNED",
  "MAINTENANCE",
  "INACTIVE",
]);

/**
 * ============================================================
 * LIST QUERY
 * ============================================================
 */

export const adminVehicleListQuerySchema = z.object({
  keyword: z.string().optional().default(""),

  status: vehicleStatusSchema.optional(),

  vehicleTypeId: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;

      const number = Number(value);

      return Number.isNaN(number) ? undefined : number;
    }),

  page: z.string().optional().default("1").transform(Number),

  limit: z.string().optional().default("10").transform(Number),
});

/**
 * ============================================================
 * CREATE VEHICLE
 * ============================================================
 */

export const createAdminVehicleSchema = z.object({
  internalCode: z.string().trim().max(50).nullable().optional(),

  licensePlate: z
    .string()
    .trim()
    .min(1, "Biển số xe không được để trống")
    .max(20),

  vehicleName: z.string().trim().max(100).nullable().optional(),

  manufactureYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .nullable()
    .optional(),

  vehicleTypeId: z.number().int().positive(),

  seatLayoutId: z.number().int().positive(),

  status: vehicleStatusSchema.default("AVAILABLE"),

  note: z.string().trim().max(255).nullable().optional(),
});

/**
 * ============================================================
 * UPDATE VEHICLE
 * ============================================================
 *
 * Khi edit:
 * - vehicleTypeId có thể thay đổi
 * - seatLayoutId có thể thay đổi
 * - BE sẽ kiểm tra 2 cái có cùng vehicle type hay không
 */

export const updateAdminVehicleSchema = z.object({
  internalCode: z.string().trim().max(50).nullable().optional(),

  licensePlate: z
    .string()
    .trim()
    .min(1, "Biển số xe không được để trống")
    .max(20),

  vehicleName: z.string().trim().max(100).nullable().optional(),

  manufactureYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .nullable()
    .optional(),

  vehicleTypeId: z.number().int().positive().optional(),

  seatLayoutId: z.number().int().positive().optional(),

  status: vehicleStatusSchema,

  note: z.string().trim().max(255).nullable().optional(),
});

/**
 * ============================================================
 * UPDATE STATUS
 * ============================================================
 */

export const updateVehicleStatusSchema = z.object({
  status: vehicleStatusSchema,
});
