import { Seat } from "./seat.type";

export interface TripSeatResponse {
  tripId: number;
  seatLayoutId: number;
  vehicleName: string;

  licensePlate: string;

  floorCount: number;

  totalSeats: number;

  seats: Seat[];
}
