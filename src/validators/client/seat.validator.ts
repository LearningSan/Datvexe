import { z } from "zod";

export const tripSeatParamsSchema = z.object({
  tripId: z.coerce.number().int().positive(),
});

export const tripSeatQuerySchema = z.object({
  sessionId: z.string().uuid(),
});
