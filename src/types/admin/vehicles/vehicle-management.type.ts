export type VehicleStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "MAINTENANCE"
  | "INACTIVE";

/**
 * ============================================================
 * VEHICLE LIST ITEM
 * ============================================================
 */

export interface AdminVehicleItem {
  vehicleId: number;

  internalCode: string | null;
  licensePlate: string;
  vehicleName: string | null;
  manufactureYear: number | null;

  // Loại xe được gán cho vehicle
  vehicleTypeId: number;
  vehicleTypeName: string;

  // Layout thực tế đang được vehicle sử dụng
  seatLayoutId: number;
  layoutCode: string;
  layoutName: string;

  // Loại xe mà layout thuộc về
  seatLayoutVehicleTypeId: number;

  // vehicleTypeId === seatLayoutVehicleTypeId
  isLayoutMatched: boolean;

  totalSeats: number;

  status: VehicleStatus;
  note: string | null;

  upcomingTrip: string | null;

  tripCount: number;
  bookingCount: number;

  isLocked: boolean;

  createdAt: string;
}

/**
 * ============================================================
 * LIST PARAMS
 * ============================================================
 */

export interface AdminVehicleListParams {
  keyword?: string;
  status?: VehicleStatus;
  vehicleTypeId?: number;
  page?: number;
  limit?: number;
}

/**
 * ============================================================
 * LIST RESPONSE
 * ============================================================
 */

export interface AdminVehicleListResponse {
  items: AdminVehicleItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * ============================================================
 * OPTIONS
 * ============================================================
 */

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

/**
 * ============================================================
 * CREATE
 * ============================================================
 *
 * Khi tạo xe:
 * - Admin chọn loại xe
 * - Admin chọn layout
 * - BE kiểm tra layout thuộc đúng loại xe
 */

export interface CreateAdminVehiclePayload {
  internalCode?: string | null;
  licensePlate: string;
  vehicleName?: string | null;
  manufactureYear?: number | null;
  vehicleTypeId: number;
  seatLayoutId: number;
  status?: VehicleStatus;
  note?: string | null;
}

export interface UpdateAdminVehiclePayload {
  internalCode?: string | null;
  licensePlate: string;
  vehicleName?: string | null;
  manufactureYear?: number | null;
  vehicleTypeId?: number;
  seatLayoutId?: number;
  status: VehicleStatus;
  note?: string | null;
}

/**
 * ============================================================
 * STATUS
 * ============================================================
 */

export interface UpdateVehicleStatusPayload {
  status: VehicleStatus;
}
