import { z } from "zod";

export const tripSeatParamsSchema = z.object({

    tripId: z.coerce
        .number()
        .int()
        .positive()
});