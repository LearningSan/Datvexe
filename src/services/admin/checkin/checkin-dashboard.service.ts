import adminApi from "@/lib/admin/api";

import type {
  CheckinDashboardTripsResult,
  CheckinDashboardTripSort,
} from "@/types/admin/checkin/checkin-dashboard-trip.type";

import type {
  CheckinDashboardPassengersResult,
  CheckinDashboardPassengerSort,
} from "@/types/admin/checkin/checkin-dashboard-passenger.type";

import type {
  CheckinPhase,
  CheckinStatus,
  ContactStatus,
  PassengerAlertLevel,
  UpdatePassengerCheckinPayload,
  UpdatePassengerCheckinResponse,
  UpdatePassengerContactPayload,
  UpdatePassengerContactResponse,
} from "@/types/admin/checkin/checkin-operation.type";

export interface CheckinDashboardSummaryResult {
  success: true;

  range: {
    from: string;
    to: string;
  };

  seats: {
    totalSeats: number;
    notCheckedIn: number;
    checkedIn: number;
    noShow: number;
    rejected: number;
    checkinRate: number;
    noShowRate: number;
  };

  trips: {
    totalTrips: number;
    notOpen: number;
    open: number;
    reminder: number;
    warning: number;
    critical: number;
    grace: number;
    closed: number;
  };

  contacts: {
    notContacted: number;
    contacted: number;
    coming: number;
    arrivingLate: number;
    unreachable: number;
    cancelRequested: number;
  };

  alerts: {
    normal: number;
    reminder: number;
    warning: number;
    critical: number;
    overdue: number;
  };

  generatedAt: string;
}

export interface GetDashboardTripsParams {
  from?: string;
  to?: string;

  phase?: CheckinPhase;
  keyword?: string;

  page?: number;
  limit?: number;

  sort?: CheckinDashboardTripSort;
}

export interface GetDashboardPassengersParams {
  tripId: number;

  checkinStatus?: CheckinStatus;
  contactStatus?: ContactStatus;
  alert?: PassengerAlertLevel;

  keyword?: string;

  page?: number;
  limit?: number;

  sort?: CheckinDashboardPassengerSort;
}

export async function updatePassengerCheckin(
  payload: UpdatePassengerCheckinPayload,
): Promise<UpdatePassengerCheckinResponse> {
  const { bookingSeatId, ...body } = payload;

  const response = await adminApi.patch<UpdatePassengerCheckinResponse>(
    `/admin/checkins/passengers/${bookingSeatId}/checkin`,
    body,
  );

  return response.data;
}

export async function updatePassengerContact(
  payload: UpdatePassengerContactPayload,
): Promise<UpdatePassengerContactResponse> {
  const { bookingId, ...body } = payload;

  const response = await adminApi.patch<UpdatePassengerContactResponse>(
    `/admin/checkins/bookings/${bookingId}/contact`,
    body,
  );

  return response.data;
}
function removeEmptyParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  ) as Partial<T>;
}

export async function getCheckinDashboardSummary(): Promise<CheckinDashboardSummaryResult> {
  const response = await adminApi.get<CheckinDashboardSummaryResult>(
    "/admin/checkins/dashboard/summary",
  );

  return response.data;
}

export async function getCheckinDashboardTrips(
  params: GetDashboardTripsParams,
): Promise<CheckinDashboardTripsResult> {
  const response = await adminApi.get<CheckinDashboardTripsResult>(
    "/admin/checkins/dashboard/trips",
    {
      params: removeEmptyParams(params),
    },
  );

  return response.data;
}

export async function getCheckinDashboardPassengers(
  params: GetDashboardPassengersParams,
): Promise<CheckinDashboardPassengersResult> {
  const { tripId, ...query } = params;

  const response = await adminApi.get<CheckinDashboardPassengersResult>(
    `/admin/checkins/dashboard/trips/${tripId}/passengers`,
    {
      params: removeEmptyParams(query),
    },
  );

  return response.data;
}
