export type NoShowProcessStatus = "PROCESSED" | "SKIPPED" | "FAILED";

export type NoShowSeatItem = {
  bookingSeatId: number;
  bookingId: number;
  bookingCode: string;

  userId: number | null;

  seatNumber: string;
};

export type NoShowTripProcessItem = {
  tripId: number;

  status: NoShowProcessStatus;

  processedSeatCount: number;
  processedBookingCount: number;

  message?: string;
};

export type ProcessCheckinNoShowsResponse = {
  success: true;

  scannedTrips: number;
  processedTrips: number;

  processedSeatCount: number;
  processedBookingCount: number;

  failedCount: number;
  skippedCount: number;

  results: NoShowTripProcessItem[];
};
