import { z } from "zod";

export const lookupCheckinQrSchema = z.object({
  qrData: z
    .string()
    .trim()
    .min(1, "Dữ liệu QR không được để trống")
    .max(3000, "Dữ liệu QR quá dài"),

  expectedTripId: z.coerce.number().int().positive().optional(),
});

export const confirmCheckinSchema = z.object({
  bookingId: z.coerce.number().int().positive("bookingId không hợp lệ"),

  bookingSeatIds: z
    .array(z.coerce.number().int().positive())
    .min(1, "Phải chọn ít nhất một ghế")
    .max(100, "Số lượng ghế check-in không hợp lệ")
    .transform((items) => [...new Set(items)]),

  note: z.string().trim().max(255, "Ghi chú tối đa 255 ký tự").optional(),
});
