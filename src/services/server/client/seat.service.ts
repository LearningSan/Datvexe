import {
    findTripSeats,
    findTripSeatMeta
} from "@/repositories/client/seat.repo";

import { TripSeatResponse } from "@/types/client/seat/seat-response.type";

export async function getTripSeats(
    tripId: number
): Promise<TripSeatResponse> {

    const meta = await findTripSeatMeta(
        tripId
    );

    if (!meta) {

        throw new Error(
            "Trip not found"
        );
    }

    const seats = await findTripSeats(
        tripId
    );

    return {

        tripId: meta.tripId,

        vehicleName: meta.vehicleName,

        licensePlate: meta.licensePlate,

        floorCount: meta.floorCount,

        totalSeats: meta.totalSeats,

        seats
    };
}