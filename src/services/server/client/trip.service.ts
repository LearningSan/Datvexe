import { SearchTripsInput } from "@/validators/client/trip.validator";

import { searchTripsRepo,getTripFilterOptionsRepo } from "@/repositories/client/trip.repo";

export const searchTripsService = async (query: SearchTripsInput) => {
  const {
    page,
    limit,

    timeSlots,
    vehicleTypes,
    seatPositions,
    floors,

    sort,

    originCityId,
    destinationCityId,

    date,

    onlyAvailable,
  } = query;

  if (timeSlots.length > 4) {
    throw new Error("Too many time slots selected");
  }

  if (!originCityId || !destinationCityId) {
    throw new Error("Missing origin or destination");
  }

  const result = await searchTripsRepo({
    origin: originCityId,
    destination: destinationCityId,

    date,

    page,
    limit,

    timeSlots,
    vehicleTypes,
    seatPositions,
    floors,

    sort,

    onlyAvailable,
  });

  const trips = result.trips.map((row: any) => ({
    id: row.trip_id,

    origin: row.origin_hub ?? row.origin_city,
    destination: row.destination_hub ?? row.destination_city,

    originCity: row.origin_city,
    destinationCity: row.destination_city,

    pickup: row.pickup_point,

    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,

    departureDateTime: row.departure_datetime,

    arrivalDateTime: row.arrival_datetime,

    duration: row.duration_minutes ? Math.floor(row.duration_minutes / 60) : 0,

    distance: row.distance_km ? Number(row.distance_km) : 0,

    type: row.vehicle_type,

    availableSeats: row.available_seats,

    price: Number(row.price ?? 0),

    floorCount: row.floor_count,

    totalSeats: row.total_seats,

    vehicleName: row.vehicle_name,

    licensePlate: row.license_plate,
    imageUrl: row.image_url ?? null,
  }));

  return {
    trips,

    pagination: {
      page,
      limit,

      total: result.total,

      totalPages: Math.ceil(result.total / limit),
    },
  };
};
export async function getTripFilterOptionsService(input: {
  originCityId: number;
  destinationCityId: number;
  date: string;
}) {
  if (!input.originCityId || !input.destinationCityId || !input.date) {
    throw new Error("Thiếu điểm đi, điểm đến hoặc ngày đi");
  }

  return await getTripFilterOptionsRepo({
    origin: input.originCityId,
    destination: input.destinationCityId,
    date: input.date,
  });
}