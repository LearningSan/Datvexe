import type {
  CheckinPhase,
  PassengerAlertLevel,
} from "@/types/admin/checkin/checkin-operation.type";

export type CheckinDashboardTripSort =
  | "DEPARTURE_ASC"
  | "DEPARTURE_DESC"
  | "CHECKIN_RATE_ASC"
  | "CHECKIN_RATE_DESC";

export interface CheckinDashboardTripQuery {
  from?: string;
  to?: string;

  phase?: CheckinPhase;
  keyword?: string;

  page?: number;
  limit?: number;

  sort?: CheckinDashboardTripSort;
}

export interface CheckinDashboardTripRepositoryQuery {
  from: string;
  to: string;

  keyword: string | null;

  offset: number;
  limit: number;

  sort: CheckinDashboardTripSort;
}

export interface CheckinDashboardTripRow {
  tripId: number;

  routeName: string;
  departureDatetime: string | Date;

  vehicleName: string | null;
  licensePlate: string | null;
  driverNames: string | null;

  totalSeats: string | number | null;
  checkedIn: string | number | null;
  notCheckedIn: string | number | null;
  noShow: string | number | null;
  rejected: string | number | null;

  notContacted: string | number | null;
  notified: string | number | null;
  contacted: string | number | null;
  coming: string | number | null;
  arrivingLate: string | number | null;
  unreachable: string | number | null;
  cancelRequested: string | number | null;

  totalPassengers: string | number | null;
}

export interface CheckinDashboardTripItem {
  tripId: number;

  routeName: string;
  departureDatetime: string;

  vehicleName: string | null;
  licensePlate: string | null;
  driverNames: string[];

  phase: CheckinPhase;
  highestAlert: PassengerAlertLevel;

  seats: {
    totalSeats: number;
    checkedIn: number;
    notCheckedIn: number;
    noShow: number;
    rejected: number;

    checkinRate: number;
    noShowRate: number;
  };

  contacts: {
    totalPassengers: number;

    notContacted: number;
    notified: number;

    contacted: number;
    coming: number;
    arrivingLate: number;
    unreachable: number;
    cancelRequested: number;
  };
}

export interface CheckinDashboardTripsResult {
  success: true;

  range: {
    from: string;
    to: string;
  };

  filters: {
    phase: CheckinPhase | null;
    keyword: string | null;
    sort: CheckinDashboardTripSort;
  };

  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };

  items: CheckinDashboardTripItem[];

  generatedAt: string;
}
