import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ")
    .max(100, "Email không được vượt quá 100 ký tự")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu")
    .max(100, "Mật khẩu không hợp lệ"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
