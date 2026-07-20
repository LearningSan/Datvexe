import { z } from "zod";

const checkinPhaseSchema = z.enum([
  "NOT_OPEN",
  "OPEN",
  "REMINDER",
  "WARNING",
  "CRITICAL",
  "GRACE",
  "CLOSED",
]);

const checkinDashboardTripSortSchema = z.enum([
  "DEPARTURE_ASC",
  "DEPARTURE_DESC",
  "CHECKIN_RATE_ASC",
  "CHECKIN_RATE_DESC",
]);

export const checkinDashboardTripsQuerySchema = z.object({
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),

  phase: checkinPhaseSchema.optional(),

  keyword: z
    .string()
    .trim()
    .max(100, "Từ khóa không được vượt quá 100 ký tự")
    .optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  sort: checkinDashboardTripSortSchema.default("DEPARTURE_ASC"),
});

export type CheckinDashboardTripsQueryPayload = z.infer<
  typeof checkinDashboardTripsQuerySchema
>;
