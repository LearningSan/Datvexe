export interface ScheduleVehicleType {
  id: number;
  name: string;
}

export interface ScheduleRouteItem {
  routeId: number;

  originCityId: number;
  destinationCityId: number;

  originName: string;
  destinationName: string;

  originHub: string | null;
  destinationHub: string | null;

  distanceKm: number;
  estimatedDurationMinutes: number;

  minimumPrice: number;
  maximumPrice: number;

  tripCount: number;
  tripsPerDay: number;

  firstDepartureTime: string | null;
  lastDepartureTime: string | null;

  averageIntervalMinutes: number | null;

  vehicleTypes: string[];
  vehicleNames: string[];
}

export interface ScheduleRouteResponse {
  routes: ScheduleRouteItem[];

  filterOptions: {
    vehicleTypes: ScheduleVehicleType[];
  };

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ScheduleRouteQuery {
  originCityId?: number;
  destinationCityId?: number;
  vehicleTypes?: string[];
  page?: number;
  limit?: number;
}
