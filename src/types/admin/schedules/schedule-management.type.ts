export interface AdminScheduleTemplateItem {
  scheduleTemplateId: number;

  routeId: number;
  routeName: string;
  originCityName: string;
  destinationCityName: string;

  departureTime: string;
  estimatedDuration: number;
  basePrice: number;

  isActive: boolean;

  tripCount: number;
  upcomingTripCount: number;

  createdAt: string;
}

export interface AdminScheduleTemplateListParams {
  keyword?: string;
  routeId?: number;
  status?: "ACTIVE" | "INACTIVE";
  page?: number;
  limit?: number;
}

export interface AdminScheduleTemplateListResponse {
  items: AdminScheduleTemplateItem[];
  total: number;
  page: number;
  limit: number;

  summary: {
    totalSchedules: number;
    activeSchedules: number;
    inactiveSchedules: number;
    usedSchedules: number;
  };
}

export interface CreateAdminScheduleTemplatePayload {
  routeId: number;
  departureTime: string;
  estimatedDuration: number;
  basePrice: number;
}

export interface UpdateAdminScheduleTemplatePayload {
  departureTime: string;
  estimatedDuration: number;
  basePrice: number;
}

export interface UpdateScheduleTemplateStatusPayload {
  isActive: boolean;
}

export interface AdminScheduleRouteOption {
  routeId: number;
  routeName: string;
}

export interface AdminScheduleVehicleOption {
  vehicleId: number;
  licensePlate: string;
  vehicleTypeName: string;
}

export interface AdminScheduleTemplateOption {
  scheduleTemplateId: number;
  routeId: number;
  scheduleName: string;
}

export interface AdminScheduleTemplateOptionsResponse {
  routes: AdminScheduleRouteOption[];
  vehicles: AdminScheduleVehicleOption[];
  scheduleTemplates: AdminScheduleTemplateOption[];
}
export type ScheduleGenerateRepeatType =
  | "DAILY"
  | "WEEKLY"
  | "WEEKDAYS"
  | "WEEKENDS";

export interface GenerateTripsFromSchedulePayload {
  scheduleTemplateId: number;
  dateFrom: string;
  dateTo: string;
  repeatType: ScheduleGenerateRepeatType;
  vehicleId?: number | null;
  ticketPrice?: number | null;
}

export interface GenerateTripsFromScheduleResult {
  createdCount: number;
  skippedCount: number;
}
