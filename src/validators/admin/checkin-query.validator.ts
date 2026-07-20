import { z } from "zod";

export const upcomingCheckinTripsQuerySchema = z.object({
  hours: z.coerce.number().int().min(1).max(72).default(24),

  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const tripCheckinPassengersParamsSchema = z.object({
  tripId: z.coerce.number().int().positive(),
});

export const tripCheckinPassengersQuerySchema = z.object({
  filter: z
    .enum([
      "ALL",
      "NOT_CHECKED_IN",
      "CHECKED_IN",
      "NO_SHOW",
      "REJECTED",
      "NEED_CONTACT",
      "COMING",
      "ARRIVING_LATE",
      "UNREACHABLE",
      "CRITICAL",
    ])
    .default("ALL"),

  keyword: z.string().trim().max(100).optional().default(""),
});

export type UpcomingCheckinTripsQuery = z.infer<
  typeof upcomingCheckinTripsQuerySchema
>;

export type TripCheckinPassengersQuery = z.infer<
  typeof tripCheckinPassengersQuerySchema
>;
