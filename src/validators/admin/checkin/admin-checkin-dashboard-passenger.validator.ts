import { z } from "zod";

export const checkinDashboardTripIdSchema = z.coerce
  .number()
  .int()
  .positive("tripId không hợp lệ");

const checkinStatusSchema = z.enum([
  "NOT_CHECKED_IN",
  "CHECKED_IN",
  "NO_SHOW",
  "REJECTED",
]);

const contactStatusSchema = z.enum([
  "NOT_CONTACTED",
  "NOTIFIED",
  "CONTACTED",
  "COMING",
  "ARRIVING_LATE",
  "UNREACHABLE",
  "CANCEL_REQUESTED",
]);

const passengerAlertLevelSchema = z.enum([
  "NORMAL",
  "REMINDER",
  "WARNING",
  "CRITICAL",
  "OVERDUE",
]);

const passengerSortSchema = z.enum([
  "SEAT_ASC",
  "SEAT_DESC",
  "NAME_ASC",
  "NAME_DESC",
  "ALERT_DESC",
]);

export const checkinDashboardPassengersQuerySchema = z.object({
  checkinStatus: checkinStatusSchema.optional(),
  contactStatus: contactStatusSchema.optional(),
  alert: passengerAlertLevelSchema.optional(),

  keyword: z
    .string()
    .trim()
    .max(100, "Từ khóa không được vượt quá 100 ký tự")
    .optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  sort: passengerSortSchema.default("SEAT_ASC"),
});

export type CheckinDashboardPassengersQueryPayload = z.infer<
  typeof checkinDashboardPassengersQuerySchema
>;
