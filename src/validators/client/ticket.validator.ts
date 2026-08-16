import { z } from "zod";

export const bookingIdParamsSchema = z.object({
  bookingId: z.coerce.number().int().positive("bookingId không hợp lệ"),
});

export const changeTicketPayloadSchema = z.object({
  newTripId: z.coerce.number().int().positive("newTripId không hợp lệ"),

  newSeatLayoutDetailIds: z
    .array(z.coerce.number().int().positive("seatLayoutDetailId không hợp lệ"))
    .min(1, "Phải chọn ít nhất một ghế"),
});

export type ChangeTicketInput = z.infer<typeof changeTicketPayloadSchema>;
