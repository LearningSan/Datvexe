import { NextRequest } from "next/server";

import { searchTripsSchema } from "@/validators/client/trip.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

import { searchTripsService } from "@/services/server/client/trip.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = searchTripsSchema.safeParse({
      originCityId: searchParams.get("origin"),
      destinationCityId: searchParams.get("destination"),

      date: searchParams.get("date"),

      requiredSeats: searchParams.get("requiredSeats"),

      page: searchParams.get("page"),
      limit: searchParams.get("limit"),

      timeSlots: searchParams.getAll("timeSlots"),
      vehicleTypes: searchParams.getAll("vehicleTypes"),
      seatPositions: searchParams.getAll("seatPositions"),
      floors: searchParams.getAll("floors"),

      sort: searchParams.get("sort"),

      onlyAvailable: searchParams.get("onlyAvailable"),
    });
    if (!parsed.success) {
      return errorResponse(
        "Validation failed",

        parsed.error.flatten().fieldErrors,

        400,
      );
    }
    const data = await searchTripsService(parsed.data);

    return successResponse(
      data,

      "Trips fetched successfully",
    );
  } catch (error: unknown) {
    console.error("SEARCH_TRIPS_ERROR", error);

    if (error instanceof Error) {
      return errorResponse(
        error.message,

        null,

        500,
      );
    }

    return errorResponse(
      "Internal server error",

      null,

      500,
    );
  }
}
