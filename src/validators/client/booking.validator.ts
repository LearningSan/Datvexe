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
    if (data.method === "OFFICE" && !data.pickupPointId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "pickupPointId is required",
      });
    }

    if (data.method === "SHUTTLE" && !data.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "address is required",
      });
    }
  });

const bookingJourneySchema = z.object({
  tripId: z.coerce.number(),

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

export const createBookingSchema = z.object({
  sessionId: z.string().min(1),

  contactName: z.string().min(1),

  contactPhone: z.string().min(1),

  contactEmail: z.string().email(),
  
  promoCode: z.string().trim().optional().nullable(),

  outbound: bookingJourneySchema,

  return: bookingJourneySchema.optional(),
});
export const holdSeatsSchema = z.object({
  tripId: z.coerce.number().int().positive("tripId không hợp lệ"),

  seatLayoutDetailIds: z
    .array(z.coerce.number().int().positive("seatLayoutDetailId không hợp lệ"))
    .min(1, "Phải chọn ít nhất 1 ghế")
    .max(5, "Chỉ được chọn tối đa 5 ghế"),
  sessionId: z.string().trim().min(1, "sessionId không hợp lệ"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export type BookingJourneyInput = CreateBookingInput["outbound"];
export interface CreateSingleBookingInput {
  tripId: number;

  sessionId: string;

  contactName: string;
  contactPhone: string;
  contactEmail: string;

  promoCode?: string | null;

  seats: BookingJourneyInput["seats"];

  pickup: BookingJourneyInput["pickup"];

  dropoff: BookingJourneyInput["dropoff"];
}
export type HoldSeatsInput = z.infer<typeof holdSeatsSchema>;

export function validateHoldSeatsPayload(body: unknown): HoldSeatsInput {
  return holdSeatsSchema.parse(body);
}
export function validateReleaseSeatsPayload(body: unknown): HoldSeatsInput {
  return holdSeatsSchema.parse(body);
}


export const getBookingsByGroupSchema = z.object({
  bookingGroupId: z
    .number()
    .min(1)
    .int("bookingGroupId phải là số nguyên")
    .positive("bookingGroupId không hợp lệ"),
});


export type GetBookingsByGroupInput =
  z.infer<typeof getBookingsByGroupSchema>;