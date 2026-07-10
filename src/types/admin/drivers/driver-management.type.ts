export type AdminDriverType = "BUS" | "SHUTTLE" | "BOTH";
export type AdminDriverStatus = "AVAILABLE" | "ASSIGNED" | "OFF";

export interface AdminDriverItem {
  driverId: number;
  userId: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  driverType: AdminDriverType;
  licenseNumber: string;
  status: AdminDriverStatus;
  hiredDate: string | null;
  assignedTripCount: number;
  createdAt: string;
}

export interface AdminDriverListParams {
  keyword?: string;
  driverType?: AdminDriverType;
  status?: AdminDriverStatus;
  warning?: "EXPIRED_LICENSE" | "NO_ASSIGNED_VEHICLE" | "INACTIVE";
  page?: number;
  limit?: number;
}

export interface AdminDriverListResponse {
  items: AdminDriverItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminDriverDetail {
  driverId: number;
  userId: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  driverType: AdminDriverType;
  licenseNumber: string;
  status: AdminDriverStatus;
  hiredDate: string | null;
  createdAt: string;
  assignedTripCount: number;
  upcomingTripCount: number;
  completedTripCount: number;
  loginMethods: string[];
  assignments: {
    tripId: number;
    routeName: string;
    originCityName: string;
    destinationCityName: string;
    departureDatetime: string;
    arrivalDatetime: string;
    tripStatus: string;
    assignedRole: string;
    vehicleName: string | null;
    licensePlate: string | null;
  }[];
}
