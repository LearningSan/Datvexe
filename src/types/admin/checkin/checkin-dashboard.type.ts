import type {
  CheckinPhase,
  PassengerAlertLevel,
  PassengerContactStatus,
} from "./checkin-operation.type";

export type CheckinDashboardSeatStats = {
  totalSeats: number;
  notCheckedIn: number;
  checkedIn: number;
  noShow: number;
  rejected: number;

  checkinRate: number;
  noShowRate: number;
};

export type CheckinDashboardTripStats = {
  totalTrips: number;

  notOpen: number;
  open: number;
  reminder: number;
  warning: number;
  critical: number;
  grace: number;
  closed: number;
};

export type CheckinDashboardContactStats = {
  notContacted: number;
  contacted: number;
  coming: number;
  arrivingLate: number;
  unreachable: number;
  cancelRequested: number;
};

export type CheckinDashboardAlertStats = {
  normal: number;
  reminder: number;
  warning: number;
  critical: number;
  overdue: number;
};

export type CheckinDashboardSummaryResponse = {
  success: true;

  range: {
    from: string;
    to: string;
  };

  seats: CheckinDashboardSeatStats;
  trips: CheckinDashboardTripStats;
  contacts: CheckinDashboardContactStats;
  alerts: CheckinDashboardAlertStats;

  generatedAt: string;
};

export type CheckinDashboardTripItem = {
  tripId: number;

  routeName: string;
  departureDatetime: string;

  tripStatus: string;
  checkinPhase: CheckinPhase;
  alertLevel: PassengerAlertLevel;

  totalSeats: number;
  checkedInSeats: number;
  notCheckedInSeats: number;
  noShowSeats: number;
  rejectedSeats: number;

  checkinRate: number;

  totalBookings: number;
  contactedBookings: number;
  arrivingLateBookings: number;
  unreachableBookings: number;
};

export type CheckinDashboardTripsResponse = {
  success: true;

  total: number;
  items: CheckinDashboardTripItem[];
};
