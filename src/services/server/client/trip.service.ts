import { SearchTripsInput } from "@/validators/client/trip.validator";

import {
  searchTripsRepo,
  getTripFilterOptionsRepo,
  getScheduleRoutesRepo,
  getScheduleVehicleTypesRepo,
} from "@/repositories/client/trip.repo";

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
interface GetScheduleRoutesInput {
  originCityId?: number;
  destinationCityId?: number;
  vehicleTypes?: string[];
  page?: number;
  limit?: number;
}

function calculateAverageInterval(
  firstDepartureTime: string | null,
  lastDepartureTime: string | null,
  tripsPerDay: number,
) {
  if (!firstDepartureTime || !lastDepartureTime || tripsPerDay <= 1) {
    return null;
  }

  const [firstHour, firstMinute] = firstDepartureTime.split(":").map(Number);

  const [lastHour, lastMinute] = lastDepartureTime.split(":").map(Number);

  const firstTotalMinutes = firstHour * 60 + firstMinute;
  const lastTotalMinutes = lastHour * 60 + lastMinute;

  const operatingMinutes = lastTotalMinutes - firstTotalMinutes;

  if (operatingMinutes <= 0) {
    return null;
  }

  return Math.round(operatingMinutes / (tripsPerDay - 1));
}

export async function getScheduleRoutesService(input: GetScheduleRoutesInput) {
  if (
    input.originCityId &&
    input.destinationCityId &&
    input.originCityId === input.destinationCityId
  ) {
    throw new Error("Điểm đi và điểm đến không được trùng nhau");
  }

  const [result, vehicleTypes] = await Promise.all([
    getScheduleRoutesRepo({
      originCityId: input.originCityId,
      destinationCityId: input.destinationCityId,
      vehicleTypes: input.vehicleTypes ?? [],
      page: input.page ?? 1,
      limit: input.limit ?? 10,
    }),
    getScheduleVehicleTypesRepo(),
  ]);
  const routes = result.rows.map((row: any) => {
    const tripsPerDay = Number(row.tripsPerDay ?? 0);

    return {
      routeId: Number(row.routeId),

      originCityId: Number(row.originCityId),
      destinationCityId: Number(row.destinationCityId),

      originName: row.originName,
      destinationName: row.destinationName,

      originHub: row.originHub ?? null,
      destinationHub: row.destinationHub ?? null,

      distanceKm: Number(row.distanceKm ?? 0),
      estimatedDurationMinutes: Number(row.estimatedDurationMinutes ?? 0),

      minimumPrice: Number(row.minimumPrice ?? 0),
      maximumPrice: Number(row.maximumPrice ?? 0),

      tripCount: Number(row.tripCount ?? 0),
      tripsPerDay,

      firstDepartureTime: row.firstDepartureTime ?? null,
      lastDepartureTime: row.lastDepartureTime ?? null,

      averageIntervalMinutes: calculateAverageInterval(
        row.firstDepartureTime,
        row.lastDepartureTime,
        tripsPerDay,
      ),

      vehicleTypes:
        typeof row.vehicleTypes === "string" && row.vehicleTypes
          ? row.vehicleTypes.split("||")
          : [],
      vehicleNames: row.vehicleNames ? row.vehicleNames.split("||") : [],
    };
  });

  return {
    routes,
    filterOptions: {
      vehicleTypes,
    },
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    },
  };
}
