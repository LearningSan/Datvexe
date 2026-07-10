import {
  countBookingsByTrip,
  createAdminTripRepo,
  findAdminTripOptions,
  findAdminTrips,
  updateAdminTripRepo,
  updateTripStatusRepo,
  bulkUpdateTripPriceRepo,
  copyTripsRepo,
} from "@/repositories/admin/trip.repo";

import type {
  AdminTripListParams,
  CreateAdminTripPayload,
  TripStatus,
  UpdateAdminTripPayload,
  BulkUpdateTripPricePayload,
  CopyTripsPayload,
} from "@/types/admin/trips/trip-management.type";

export async function copyAdminTrips(payload: CopyTripsPayload) {
  if (new Date(payload.targetDateTo) < new Date(payload.targetDateFrom)) {
    throw new Error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
  }

  return await copyTripsRepo(payload);
}

export async function bulkUpdateAdminTripPrice(
  payload: BulkUpdateTripPricePayload,
) {
  if (new Date(payload.dateTo) < new Date(payload.dateFrom)) {
    throw new Error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
  }

  return await bulkUpdateTripPriceRepo(payload);
}
export async function getAdminTrips(params: AdminTripListParams) {
  return await findAdminTrips(params);
}

export async function getAdminTripOptions() {
  return await findAdminTripOptions();
}

export async function createAdminTrip(data: CreateAdminTripPayload) {
  const departure = new Date(data.departureDatetime);
  const arrival = new Date(data.arrivalDatetime);

  if (arrival <= departure) {
    throw new Error("Thời gian đến phải lớn hơn thời gian khởi hành");
  }

  return await createAdminTripRepo(data);
}

export async function updateAdminTrip(
  tripId: number,
  data: UpdateAdminTripPayload,
) {
  const bookingCount = await countBookingsByTrip(tripId);

  if (bookingCount > 0 && data.status === "CANCELLED") {
    throw new Error(
      "Chuyến đã có booking. Vui lòng dùng chức năng hủy chuyến có lý do để xử lý thông báo/hoàn tiền",
    );
  }

  return await updateAdminTripRepo(tripId, data);
}

export async function updateAdminTripStatus(
  tripId: number,
  status: TripStatus,
  reason?: string,
) {
  const bookingCount = await countBookingsByTrip(tripId);

  if (status === "CANCELLED" && bookingCount > 0 && !reason?.trim()) {
    throw new Error("Cần nhập lý do hủy chuyến vì chuyến đã có booking");
  }

  return await updateTripStatusRepo(tripId, status);
}
