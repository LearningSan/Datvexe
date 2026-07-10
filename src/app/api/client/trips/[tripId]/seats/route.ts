import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/server/response";

import { getTripSeats } from "@/services/server/client/seat.service";

import { tripSeatParamsSchema } from "@/validators/client/seat.validator";

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

    const validated = tripSeatParamsSchema.parse(params);

    const result = await getTripSeats(validated.tripId);

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
