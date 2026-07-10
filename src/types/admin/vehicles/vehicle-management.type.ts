export type VehicleStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "MAINTENANCE"
  | "INACTIVE";

export interface AdminVehicleItem {
  vehicleId: number;
  internalCode: string | null;
  licensePlate: string;
  vehicleName: string | null;
  vehicleTypeId: number;
  vehicleTypeName: string;
  seatLayoutId: number;
  layoutCode: string;
  layoutName: string;
  totalSeats: number;
  status: VehicleStatus;
  note: string | null;
  upcomingTrip: string | null;
  tripCount: number;
  bookingCount: number;
  isLocked: boolean;
  createdAt: string;
}

export interface AdminVehicleListParams {
  keyword?: string;
  status?: VehicleStatus;
  vehicleTypeId?: number;
  page?: number;
  limit?: number;
}

export interface AdminVehicleListResponse {
  items: AdminVehicleItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminVehicleOption {
  vehicleTypeId: number;
  vehicleTypeName: string;
  seatLayoutId: number;
  layoutCode: string;
  layoutName: string;
  totalSeats: number;
}

export interface AdminVehicleOptionsResponse {
  vehicleTypes: AdminVehicleOption[];
}

export interface CreateAdminVehiclePayload {
  internalCode: string;
  licensePlate: string;
  vehicleName?: string | null;
  vehicleTypeId: number;
  status: VehicleStatus;
  note?: string | null;
}

export interface UpdateAdminVehiclePayload {
  internalCode: string;
  licensePlate: string;
  vehicleName?: string | null;
  vehicleTypeId?: number;
  status: VehicleStatus;
  note?: string | null;
}

export interface UpdateVehicleStatusPayload {
  status: VehicleStatus;
}
