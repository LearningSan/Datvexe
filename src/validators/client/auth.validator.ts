import { z } from "zod";

const emailSchema = z.string().trim().email("Email không hợp lệ");

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+84|84|0)(3|5|7|8|9)\d{8}$/, "Số điện thoại không hợp lệ");


export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự"),

  email: z.string().trim().email("Email không hợp lệ"),

  phone: z
    .string()
    .trim()
    .regex(/^(\+84|84|0)(3|5|7|8|9)\d{8}$/, "Số điện thoại không hợp lệ"),

  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
  otp: z.string().length(6, "OTP phải gồm 6 số"),
});

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email hoặc số điện thoại")
    .refine(
      (value) =>
        emailSchema.safeParse(value).success ||
        phoneSchema.safeParse(value).success,
      {
        message: "Email hoặc số điện thoại không hợp lệ",
      },
    ),

  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
