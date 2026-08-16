import { z } from "zod";

export const duplicateSeatLayoutSchema = z.object({
  layoutCode: z.string().min(1, "Vui lòng nhập mã layout mới"),
  layoutName: z.string().min(1, "Vui lòng nhập tên layout mới"),
});

export const updateSeatLayoutStatusSchema = z.object({
  isActive: z.boolean(),
});

export const updateSeatLayoutDetailSchema = z.object({
  seatNumber: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên ghế")
    .max(50, "Tên ghế không được vượt quá 50 ký tự"),

  seatType: z.enum(["NORMAL", "VIP"]),
});
