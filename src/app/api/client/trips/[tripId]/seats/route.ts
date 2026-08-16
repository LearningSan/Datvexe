import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/server/response";

import { getTripSeats } from "@/services/server/client/seat.service";

import {
  tripSeatParamsSchema,
  tripSeatQuerySchema,
} from "@/validators/client/seat.validator";

export async function GET(
  req: NextRequest,
  context: {
    params: Promise<{
      tripId: string;
    }>;
  },
) {
  try {
    const params = await context.params;

    const validatedParams = tripSeatParamsSchema.parse(params);
    const validatedQuery = tripSeatQuerySchema.parse({
      sessionId: req.nextUrl.searchParams.get("sessionId"),
    });

    const result = await getTripSeats(
      validatedParams.tripId,
      validatedQuery.sessionId,
    );
    return successResponse(result);
  } catch (error: any) {
    console.error(error);

    if (error.name === "ZodError") {
      return errorResponse(
        "Validation failed",
        error.flatten().fieldErrors,
        400,
      );
    }

    return errorResponse(error.message || "Failed to fetch seats", null, 500);
  }
}
