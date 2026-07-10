export type SeatType = "NORMAL" | "VIP";

export interface SeatLayoutItem {
  seatLayoutId: number;
  vehicleTypeId: number;
  vehicleTypeName: string;
  layoutCode: string;
  layoutName: string;
  totalSeats: number;
  actualSeats: number;
  floorCount: number;
  isActive: boolean;
  vehicleCount: number;
  bookingSeatCount: number;
  isLocked: boolean;
  warnings: string[];
}

export interface SeatLayoutDetail {
  seatLayoutDetailId: number;
  seatNumber: string;
  seatType: SeatType;
  floorNo: number;
  rowNo: number;
  columnNo: number;
  isActive: boolean;
}

export interface SeatLayoutDetailResponse {
  layout: SeatLayoutItem;
  details: SeatLayoutDetail[];
  vehicles: {
    vehicleId: number;
    internalCode: string | null;
    licensePlate: string;
    vehicleName: string | null;
    status: string;
  }[];
}

export interface DuplicateSeatLayoutPayload {
  layoutCode: string;
  layoutName: string;
}
