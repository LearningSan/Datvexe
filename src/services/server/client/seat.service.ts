import {
  findTripSeats,
  findTripSeatMeta,
} from "@/repositories/client/seat.repo";

export async function getTripSeats(tripId: number, sessionId: string) {
  const meta = await findTripSeatMeta(tripId);

  if (!meta) {
    throw new Error("Trip not found");
  }

  const seats = await findTripSeats(tripId, sessionId);

  return {
    tripId: meta.tripId,
    seatLayoutId: meta.seatLayoutId,
    vehicleName: meta.vehicleName,
    licensePlate: meta.licensePlate,
    floorCount: meta.floorCount,
    totalSeats: meta.totalSeats,
    seats,
  };
}
