import { z } from "zod";

export const adminUserListQuerySchema = z.object({
  keyword: z.string().optional().default(""),
  status: z.enum(["ACTIVE", "BLOCKED"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export const createAdminUserSchema = z.object({
  fullName: z.string().min(2, "Họ tên không hợp lệ"),
  email: z.string().email("Email không hợp lệ").optional().nullable(),
  phone: z.string().min(9, "Số điện thoại không hợp lệ").optional().nullable(),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export const updateAdminUserSchema = z.object({
  fullName: z.string().min(2, "Họ tên không hợp lệ"),
  email: z.string().email("Email không hợp lệ").optional().nullable(),
  phone: z.string().min(9, "Số điện thoại không hợp lệ").optional().nullable(),
});

export const updateAdminUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "BLOCKED"]),
});