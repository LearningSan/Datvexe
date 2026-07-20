import { z } from "zod";

export const updatePassengerContactSchema = z
  .object({
    bookingId: z.coerce.number().int().positive(),

    tripId: z.coerce.number().int().positive(),

    contactType: z.enum([
      "PHONE_CALL",
      "IN_APP_NOTIFICATION",
      "EMAIL",
      "MANUAL",
    ]),

    contactResult: z.enum([
      "CONTACTED",
      "COMING",
      "ARRIVING_LATE",
      "UNREACHABLE",
      "CANCEL_REQUESTED",
    ]),

    expectedArrivalAt: z
      .string()
      .datetime({
        offset: true,
      })
      .nullable()
      .optional(),

    note: z.string().trim().max(500).nullable().optional(),
  })
  .superRefine((data, context) => {
    if (data.contactResult === "ARRIVING_LATE" && !data.expectedArrivalAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedArrivalAt"],
        message: "Phải nhập thời gian khách dự kiến đến khi khách báo đến trễ",
      });
    }

    if (data.contactResult !== "ARRIVING_LATE" && data.expectedArrivalAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expectedArrivalAt"],
        message: "Chỉ được nhập thời gian dự kiến khi khách báo đến trễ",
      });
    }

    if (data.contactResult === "CANCEL_REQUESTED" && !data.note?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Phải nhập ghi chú khi khách yêu cầu hủy vé",
      });
    }
  });

export const contactHistoryParamsSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

export const contactHistoryQuerySchema = z.object({
  tripId: z.coerce.number().int().positive(),
});

export type UpdatePassengerContactInput = z.infer<
  typeof updatePassengerContactSchema
>;
