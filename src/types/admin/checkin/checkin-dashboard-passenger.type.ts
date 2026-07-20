import type {
  CheckinStatus,
  ContactStatus,
  PassengerAlertLevel,
} from "@/types/admin/checkin/checkin-operation.type";

export type CheckinDashboardPassengerSort =
  | "SEAT_ASC"
  | "SEAT_DESC"
  | "NAME_ASC"
  | "NAME_DESC"
  | "ALERT_DESC";

export interface CheckinDashboardPassengerQuery {
  tripId: number;

  checkinStatus?: CheckinStatus;
  contactStatus?: ContactStatus;
  alert?: PassengerAlertLevel;

  keyword?: string;

  page?: number;
  limit?: number;

  sort?: CheckinDashboardPassengerSort;
}

export interface CheckinDashboardPassengerRepositoryQuery {
  tripId: number;

  checkinStatus: CheckinStatus | null;
  contactStatus: ContactStatus | null;

  keyword: string | null;

  offset: number;
  limit: number;

  sort: CheckinDashboardPassengerSort;
}

export interface CheckinDashboardTripInfoRow {
  tripId: number;

  routeName: string;
  departureDatetime: string | Date;

  vehicleName: string | null;
  licensePlate: string | null;

  tripStatus: string;
}

export interface CheckinDashboardPassengerRow {
  bookingSeatId: number;
  bookingId: number;
  bookingCode: string;

  seatNumber: string;

  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;

  checkinStatus: CheckinStatus;
  checkedInAt: string | Date | null;
  checkinNote: string | null;

  contactStatus: ContactStatus;
  expectedArrivalAt: string | Date | null;
  lastContactedAt: string | Date | null;
  contactNote: string | null;

  pickupMethod: "OFFICE" | "SHUTTLE";
  pickupPointName: string | null;
  pickupAddress: string | null;
}

export interface CheckinDashboardPassengerItem {
  bookingSeatId: number;
  bookingId: number;
  bookingCode: string;

  seatNumber: string;

  passenger: {
    name: string;
    phone: string;
    email: string | null;
  };

  checkin: {
    status: CheckinStatus;
    checkedInAt: string | null;
    note: string | null;
  };

  contact: {
    status: ContactStatus;
    expectedArrivalAt: string | null;
    lastContactedAt: string | null;
    note: string | null;
  };

  pickup: {
    method: "OFFICE" | "SHUTTLE";
    pointName: string | null;
    address: string | null;
  };

  alert: {
    level: PassengerAlertLevel;
    message: string | null;
  };
}

export interface CheckinDashboardPassengersResult {
  success: true;

  trip: {
    tripId: number;
    routeName: string;
    departureDatetime: string;

    vehicleName: string | null;
    licensePlate: string | null;

    status: string;
  };

  filters: {
    checkinStatus: CheckinStatus | null;
    contactStatus: ContactStatus | null;
    alert: PassengerAlertLevel | null;
    keyword: string | null;
    sort: CheckinDashboardPassengerSort;
  };

  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };

  summary: {
    totalSeats: number;
    checkedIn: number;
    notCheckedIn: number;
    noShow: number;
    rejected: number;

    normal: number;
    reminder: number;
    warning: number;
    critical: number;
    overdue: number;
  };

  items: CheckinDashboardPassengerItem[];

  generatedAt: string;
}
