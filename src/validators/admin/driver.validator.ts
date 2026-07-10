import { z } from "zod";

export const adminDriverListQuerySchema = z.object({
  keyword: z.string().optional().default(""),
  driverType: z.enum(["BUS", "SHUTTLE", "BOTH"]).optional(),
  status: z.enum(["AVAILABLE", "ASSIGNED", "OFF"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});
export const createAdminDriverSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(9).optional().nullable(),
  password: z.string().min(6),
  roleId: z.coerce.number().min(1),

  driverType: z.enum(["BUS", "SHUTTLE", "BOTH"]),
  licenseNumber: z.string().min(3),
  hiredDate: z.string().optional().nullable(),
});

export const updateAdminDriverSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(9).optional().nullable(),

  driverType: z.enum(["BUS", "SHUTTLE", "BOTH"]),
  licenseNumber: z.string().min(3),
  hiredDate: z.string().optional().nullable(),
});

export const updateAdminDriverStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "ASSIGNED", "OFF"]),
});
