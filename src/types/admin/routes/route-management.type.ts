export type AdminRouteStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "NO_SCHEDULE"
  | "MISSING_CONFIG";

export interface AdminRouteItem {
  routeId: number;
  originCityId: number;
  destinationCityId: number;
  originCityName: string;
  destinationCityName: string;
  originHubId: number | null;
  destinationHubId: number | null;
  originHubName: string | null;
  destinationHubName: string | null;
  distanceKm: number | null;
  estimatedDuration: number | null;
  basePrice: number | null;
  status: "ACTIVE" | "SUSPENDED";
  routeStatus: AdminRouteStatus;
  scheduleCount: number;
  tripCount: number;
  bookingCount: number;
  soldTicketCount: number;
  revenue: number;
  hasTrips: boolean;
  createdAt: string;
}

export interface AdminRouteListParams {
  keyword?: string;
  originCityId?: number;
  destinationCityId?: number;
  status?: AdminRouteStatus;
  sort?: "NEWEST" | "OLDEST" | "REVENUE_DESC" | "BOOKING_DESC";
  groupBy?: "ORIGIN_CITY" | "NONE";
  page?: number;
  limit?: number;
}

export interface AdminRouteListResponse {
  items: AdminRouteItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminRoutePayload {
  originCityId: number;
  destinationCityId: number;
  originHubId?: number | null;
  destinationHubId?: number | null;
  distanceKm: number;
  estimatedDuration: number;
  basePrice: number;
  status: "ACTIVE" | "SUSPENDED";
  reason?: string;
}

export interface AdminRouteOption {
  id: number;
  name: string;
  cityId?: number;
}

export interface AdminRouteOptionsResponse {
  cities: AdminRouteOption[];
  hubs: AdminRouteOption[];
}
