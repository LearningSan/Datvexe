export interface DashboardData {
  kpis: {
    netRevenue: number;
    onlineRevenue: number;
    cashToCollect: number;
    refundedAmount: number;
    ticketsSold: number;
    confirmedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    bookingSuccessRate: number;
    cancellationRate: number;
    occupancyRate: number;
    failedPayments: number;
    tripsMissingVehicle: number;
    tripsMissingDriver: number;
    upcomingLowOccupancyTrips: number;
  };

  revenueTrend: {
    date: string;
    grossRevenue: number;
    refundedAmount: number;
    netRevenue: number;
  }[];

  paymentSummary: {
    method: string;
    paid: number;
    pending: number;
    failed: number;
    refunded: number;
  }[];

  paymentMethodChart: {
    method: string;
    transactionCount: number;
    revenue: number;
  }[];

  bookingStatusSummary: {
    status: string;
    total: number;
  }[];

  tripStatusChart: {
    status: string;
    count: number;
  }[];

  topRoutes: {
    routeId: number;
    routeName: string;
    ticketsSold: number;
    revenue: number;
    occupancyRate: number;
  }[];

  upcomingTrips: {
    tripId: number;
    routeName: string;
    departureTime: string;
    licensePlate: string | null;
    driverName: string | null;
    availableSeats: number;
    totalSeats: number | null;
    status: string;
    warning: string | null;
  }[];

  riskItems: {
    type: string;
    title: string;
    description: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
  }[];

  reviewSummary: {
    averageRating: number;
    totalReviews: number;
  };

  reviewRatingChart: {
    rating: number;
    count: number;
  }[];

  latestReviews: {
    customerName: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  }[];

  lowPerformanceTrips: {
    tripId: number;
    routeName: string;
    departureTime: string;
    bookedSeats: number;
    totalSeats: number;
    occupancyRate: number;
    revenue: number;
  }[];
  topSellingRoutes: {
    routeId: number;
    routeName: string;
    ticketsSold: number;
    revenue: number;
    occupancyRate: number;
  }[];

  comparisonOptions: {
    metric:
      | "REVENUE"
      | "TICKETS"
      | "BOOKING_SUCCESS"
      | "CANCELLATION"
      | "OCCUPANCY";
    label: string;
    currentValue: number;
    previousValue: number;
    changePercent: number;
  }[];

  timeSlotInsight: {
    timeSlot: string;
    totalTrips: number;
    bookedSeats: number;
    totalSeats: number;
    occupancyRate: number;
    recommendation: string;
  }[];
}
export interface RoutePerformanceData {
  summary: {
    routeName: string;
    totalTrips: number;
    totalBookedSeats: number;
    totalSeats: number;
    occupancyRate: number;
    revenue: number;
  };

  trips: {
    tripId: number;
    departureTime: string;
    bookedSeats: number;
    totalSeats: number;
    occupancyRate: number;
    revenue: number;
  }[];
}
