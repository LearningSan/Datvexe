export type PickupMethod = "OFFICE" | "SHUTTLE";

export interface CreateBookingSeat {
  seatLayoutDetailId: number;
  seatPrice: number;
}

export interface ShuttleLocation {
  method: PickupMethod;

  pickupPointId?: number;

  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateBookingPayload {
  tripId: number;

  seats: CreateBookingSeat[];

  contactName: string;
  contactPhone: string;

  pickup: ShuttleLocation;
  dropoff: ShuttleLocation;

  sessionId: string;

  userId?: number | null;
}
