export type PickupPointCategory =
  | "MAIN_HUB"
  | "OFFICE"
  | "SHUTTLE_AREA"
  | "REST_STOP";

export type PickupPointStatus = "ACTIVE" | "INACTIVE";

export interface AdminPickupPointItem {
  pickupPointId: number;
  pointName: string;
  address: string | null;
  cityId: number;
  cityName: string;
  zoneId: number;
  zoneName: string;
  pointCategory: PickupPointCategory;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  linkedTripCount: number;
  bookingCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  pickupTripCount: number;
  dropoffTripCount: number;
  pickupBookingCount: number;
  dropoffBookingCount: number;
}

export interface AdminPickupPointListParams {
  keyword?: string;
  cityId?: number;
  zoneId?: number;
  pointCategory?: PickupPointCategory;
  status?: PickupPointStatus;
  page?: number;
  limit?: number;
  warning?: "MISSING_ROUTE" | "NO_COORDINATE" | "INACTIVE";
  usageType?: "PICKUP" | "DROP_OFF" | "BOTH" | "SHUTTLE";
}

export interface AdminPickupPointListResponse {
  items: AdminPickupPointItem[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalPoints: number;
    activePoints: number;
    inactivePoints: number;
    missingConfigPoints: number;
    noCoordinatePoints: number;
  };
}

export interface CreateAdminPickupPointPayload {
  pointName: string;
  address?: string | null;
  cityId: number;
  zoneId: number;
  pointCategory: PickupPointCategory;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateAdminPickupPointPayload {
  pointName: string;
  address?: string | null;
  cityId: number;
  zoneId: number;
  pointCategory: PickupPointCategory;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdatePickupPointStatusPayload {
  isActive: boolean;
}

export interface AdminPickupPointDetail extends AdminPickupPointItem {
  canEditLocation: boolean;
  canEditCategory: boolean;
  linkedRoutes: AdminPickupPointLinkedRoute[];
}

export interface AdminPickupPointLinkedRoute {
  routeId: number;
  routeName: string;
  stopType: "PICKUP" | "DROP_OFF" | "BOTH";
  tripCount: number;
  nearestDeparture: string | null;
}
