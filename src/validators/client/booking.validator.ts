import { Contact } from "lucide-react";
import { z } from "zod";

const shuttleLocationSchema = z
  .object({
    method: z.enum(["OFFICE", "SHUTTLE"]),

    pickupPointId: z.number().optional(),

    address: z.string().optional(),

    latitude: z.number().optional(),

    longitude: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.method === "OFFICE") {
      if (!data.pickupPointId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "pickupPointId is required",
        });
      }
    }

    if (data.method === "SHUTTLE") {
      if (!data.address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "address is required",
        });
      }
    }
  });

export const createBookingSchema = z.object({
  tripId: z.coerce.number(),

  sessionId: z.string().min(1),

  contactName: z.string().min(1),

  contactPhone: z.string().min(1),
  contactEmail: z.string().min(1),
  promoCode: z.string().trim().optional().nullable(),
  seats: z
    .array(
      z.object({
        seatLayoutDetailId: z.number(),
        seatPrice: z.number().positive(),
      }),
    )
    .min(1)
    .max(5),

  pickup: shuttleLocationSchema,

  dropoff: shuttleLocationSchema,
});
export const holdSeatsSchema = z.object({
  tripId: z.coerce.number().int().positive("tripId không hợp lệ"),

  seatLayoutDetailIds: z
    .array(z.coerce.number().int().positive("seatLayoutDetailId không hợp lệ"))
    .min(1, "Phải chọn ít nhất 1 ghế")
    .max(5, "Chỉ được chọn tối đa 5 ghế"),
  sessionId: z.string().trim().min(1, "sessionId không hợp lệ"),
});

export type HoldSeatsInput = z.infer<typeof holdSeatsSchema>;

export function validateHoldSeatsPayload(body: unknown): HoldSeatsInput {
  return holdSeatsSchema.parse(body);
}
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
