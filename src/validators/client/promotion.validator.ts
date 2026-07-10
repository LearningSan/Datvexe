import { z } from "zod";

export const validatePromotionSchema = z.object({
  code: z.string().min(1),
  tripId: z.number(),
  subtotal: z.number().min(0),
});
