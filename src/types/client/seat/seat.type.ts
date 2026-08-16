export type SeatStatus = "AVAILABLE" | "BOOKED" | "HOLDING";

export type SeatType = "NORMAL" | "VIP";

export interface Seat {
  seatId: number;

  seatNumber: string;

  seatType: SeatType;

  floorNo: number;

  rowNo: number;

  columnNo: number;

  status: SeatStatus;
  isHeldByMe: boolean;
}
