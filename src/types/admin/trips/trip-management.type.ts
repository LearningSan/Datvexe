export type TripStatus =
  | "OPEN"
  | "FULL"
  | "RUNNING"
  | "COMPLETED"
  | "CANCELLED";

export type TripWarning =
  | "NO_VEHICLE"
  | "NO_DRIVER"
  | "DEPARTING_SOON"
  | "FULL_SEAT"
  | "CANCELLED";

export interface AdminTripItem {
  tripId: number;

  routeId: number;
  routeName: string;
  originCityName: string;
  destinationCityName: string;

  scheduleTemplateId: number | null;

  vehicleId: number | null;
  vehicleName: string | null;
  licensePlate: string | null;
  vehicleTypeName: string | null;

  driverNames: string | null;

  departureDatetime: string;
  arrivalDatetime: string;

  departureDate: string;
  departureTime: string;

  totalSeats: number;
  availableSeats: number;
  bookedSeats: number;

  status: TripStatus;

  bookingCount: number;

  warnings: TripWarning[];
  ticketPrice: number | null;
  createdAt: string;
    mainDriverId?: number | null;

}

export interface AdminTripListParams {
  keyword?: string;
  date?: string;
  routeId?: number;
  vehicleId?: number;
  driverId?: number;
  status?: TripStatus;
  warning?: TripWarning;
  page?: number;
  limit?: number;
}

export interface AdminTripListResponse {
  items: AdminTripItem[];
  total: number;
  page: number;
  limit: number;

  summary: {
    totalTrips: number;
    openTrips: number;
    runningTrips: number;
    cancelledTrips: number;
    noVehicleTrips: number;
    noDriverTrips: number;
    departingSoonTrips: number;
  };
}

export interface CreateAdminTripPayload {
  routeId: number;
  scheduleTemplateId: number;
  vehicleId?: number | null;
  driverId?: number | null;
  departureDatetime: string;
  arrivalDatetime: string;
  availableSeats: number;
  ticketPrice?: number | null;
}

export interface UpdateAdminTripPayload {
  vehicleId?: number | null;
  driverId?: number | null;
  departureDatetime: string;
  arrivalDatetime: string;
  status: TripStatus;
  ticketPrice?: number | null;
}

export interface UpdateTripStatusPayload {
  status: TripStatus;
  reason?: string;
}

export interface AdminTripOptionRoute {
  routeId: number;
  routeName: string;
}

export interface AdminTripOptionVehicle {
  vehicleId: number;
  vehicleName: string | null;
  licensePlate: string;
  vehicleTypeName: string;
  totalSeats: number;
  status: string;
}

export interface AdminTripOptionDriver {
  driverId: number;
  fullName: string;
  licenseNumber: string;
  status: string;
}
export interface AdminTripOptionsResponse {
  routes: AdminTripOptionRoute[];
  vehicles: AdminTripOptionVehicle[];
  drivers: AdminTripOptionDriver[];
  scheduleTemplates: AdminTripOptionScheduleTemplate[];
}
export interface AdminTripOptionScheduleTemplate {
  scheduleTemplateId: number;
  routeId: number;
  scheduleName: string;
  departureTime: string;
  estimatedDuration: number;
  basePrice: number;
}
export interface CopyTripsPayload {
  sourceDate: string;
  targetDateFrom: string;
  targetDateTo: string;
  routeId?: number;
  keepVehicle: boolean;
  keepPrice: boolean;
  overwriteExisting: boolean;
}

export interface BulkUpdateTripPricePayload {
  routeId?: number;
  dateFrom: string;
  dateTo: string;
  priceMode: "FIXED" | "PERCENT";
  priceValue: number;
}

export interface BulkActionResult {
  createdCount?: number;
  updatedCount?: number;
  skippedCount?: number;
}
