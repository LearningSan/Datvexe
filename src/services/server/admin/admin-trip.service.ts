import { withTransaction } from "@/lib/server/mysql";
import {
  countBookingsByTrip,
  createAdminTripRepo,
  findAdminTripOptions,
  findAdminTrips,
  updateAdminTripRepo,
  updateTripStatusRepo,
  bulkUpdateTripPriceRepo,
  findAvailableTripResources,
  findScheduleTemplateForTrip,
  checkDriverAvailable,
  checkVehicleAvailable,
  findAdminTripById,
  findRouteForTrip,
  findScheduleTemplateForRoute,
  findTripsByDateForCopy,
  findExistingTripForCopy,
  getVehicleTotalSeatsForCopy,
  replaceTripDriverRepo,
  createCopiedTripRepo,
  updateCopiedTripRepo,
  createTripDriverRepo,
} from "@/repositories/admin/trip.repo";

import type {
  AdminTripListParams,
  CreateAdminTripPayload,
  TripStatus,
  UpdateAdminTripPayload,
  BulkUpdateTripPricePayload,
  CopyTripsPayload,
  AdminTripOptionsParams,
  BulkActionResult,
} from "@/types/admin/trips/trip-management.type";
export function validateCopyDateRange(payload: CopyTripsPayload) {
  if (!payload.sourceDate) {
    throw new Error("Ngày nguồn không hợp lệ");
  }

  if (!payload.targetDateFrom) {
    throw new Error("Ngày bắt đầu sao chép không hợp lệ");
  }

  if (!payload.targetDateTo) {
    throw new Error("Ngày kết thúc sao chép không hợp lệ");
  }

  const sourceDate = new Date(`${payload.sourceDate}T00:00:00`);

  const fromDate = new Date(`${payload.targetDateFrom}T00:00:00`);

  const toDate = new Date(`${payload.targetDateTo}T00:00:00`);

  if (
    Number.isNaN(sourceDate.getTime()) ||
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime())
  ) {
    throw new Error("Ngày sao chép không hợp lệ");
  }

  if (fromDate > toDate) {
    throw new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc");
  }

  /*
   * Không cho copy ngược vào ngày nguồn.
   *
   * Nếu bạn muốn cho phép thì bỏ check này.
   */
  if (fromDate <= sourceDate && toDate >= sourceDate) {
    throw new Error("Khoảng ngày sao chép không được bao gồm ngày nguồn");
  }
}
export function formatDate(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
export async function copyAdminTrips(
  payload: CopyTripsPayload,
): Promise<BulkActionResult> {
  validateCopyDateRange(payload);

  const sourceTrips = await findTripsByDateForCopy(payload);

  if (!sourceTrips.length) {
    throw new Error("Không tìm thấy chuyến nào để sao chép trong ngày nguồn");
  }

  const result: BulkActionResult = {
    createdCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    skippedItems: [],
  };

  const currentDate = new Date(`${payload.targetDateFrom}T00:00:00`);

  const endDate = new Date(`${payload.targetDateTo}T00:00:00`);

  await withTransaction(async () => {
    while (currentDate <= endDate) {
      const targetDate = formatDate(currentDate);

      for (const sourceTrip of sourceTrips) {
        try {
          /*
           * =====================================================
           * 1. SCHEDULE
           * =====================================================
           */

          const schedule = await findScheduleTemplateForRoute({
            scheduleTemplateId: Number(sourceTrip.scheduleTemplateId),
            routeId: Number(sourceTrip.routeId),
          });

          if (!schedule) {
            throw new Error(
              "Schedule template không còn tồn tại hoặc không thuộc tuyến",
            );
          }

          /*
           * =====================================================
           * 2. DATETIME
           * =====================================================
           *
           * Không lấy giờ arrival của sourceTrip.
           *
           * Lấy departureTime + estimatedDuration
           * từ schedule template.
           *
           * Như vậy nếu chuyến chạy qua 00:00
           * buildTripDatetimeFromSchedule xử lý đúng.
           */

          const { departureDatetime, arrivalDatetime } =
            buildTripDatetimeFromSchedule(
              targetDate,
              String(schedule.departureTime),
              Number(schedule.estimatedDuration),
            );

          /*
           * =====================================================
           * 3. VEHICLE
           * =====================================================
           */

          const vehicleId = payload.keepVehicle ? sourceTrip.vehicleId : null;

          /*
           * =====================================================
           * 4. DRIVER
           * =====================================================
           */

          const driverId = payload.keepDriver ? sourceTrip.driverId : null;

          /*
           * =====================================================
           * 5. FIND EXISTING
           * =====================================================
           *
           * Một chuyến được xác định bởi:
           *
           * route + departureDatetime
           *
           * Không dùng vehicle để xác định existing.
           */

          const existing = await findExistingTripForCopy({
            routeId: Number(sourceTrip.routeId),
            departureDatetime,
          });

          /*
           * =====================================================
           * 6. EXISTING TRIP
           * =====================================================
           */

          if (existing) {
            /*
             * Không cho overwrite
             */

            if (!payload.overwriteExisting) {
              throw new Error("Đã có chuyến cùng tuyến và thời gian xuất bến");
            }

            /*
             * Không overwrite chuyến đã có booking
             */

            if (Number(existing.bookingCount) > 0) {
              throw new Error("Chuyến đã có booking, không thể ghi đè");
            }

            /*
             * =================================================
             * 6.1 CHECK VEHICLE
             * =================================================
             */

            if (vehicleId !== null) {
              const vehicleResult = await checkVehicleAvailable(
                Number(vehicleId),
                Number(sourceTrip.routeId),
                departureDatetime,
                arrivalDatetime,
                Number(existing.tripId),
              );

              if (!vehicleResult.available) {
                throw new Error(
                  vehicleResult.reason ??
                    "Xe không khả dụng với lịch chuyến mới",
                );
              }
            }

            /*
             * =================================================
             * 6.2 CHECK DRIVER
             * =================================================
             */

            if (driverId !== null) {
              const driverResult = await checkDriverAvailable(
                Number(driverId),
                Number(sourceTrip.routeId),
                departureDatetime,
                arrivalDatetime,
                Number(existing.tripId),
              );

              if (!driverResult.available) {
                throw new Error(
                  driverResult.reason ??
                    "Tài xế không khả dụng với lịch chuyến mới",
                );
              }
            }

            /*
             * =================================================
             * 6.3 SEATS
             * =================================================
             */

            const totalSeats =
              vehicleId !== null
                ? await getVehicleTotalSeatsForCopy(Number(vehicleId))
                : 0;

            /*
             * =================================================
             * 6.4 PRICE
             * =================================================
             */

            const ticketPrice = payload.keepPrice
              ? sourceTrip.ticketPrice
              : Number(schedule.basePrice);

            /*
             * =================================================
             * 6.5 UPDATE TRIP
             * =================================================
             */

            await updateCopiedTripRepo({
              tripId: Number(existing.tripId),

              scheduleTemplateId: Number(sourceTrip.scheduleTemplateId),

              routeId: Number(sourceTrip.routeId),

              vehicleId,

              departureDatetime,

              arrivalDatetime,

              availableSeats: totalSeats,

              ticketPrice,
            });

            /*
             * =================================================
             * 6.6 DRIVER
             * =================================================
             *
             * replaceTripDriverRepo sẽ:
             *
             * driverId !== null
             * -> replace bằng driver mới
             *
             * driverId === null
             * -> remove driver assignment
             */

            await replaceTripDriverRepo(Number(existing.tripId), driverId);

            result.updatedCount++;

            continue;
          }

          /*
           * =====================================================
           * 7. NEW TRIP - CHECK VEHICLE
           * =====================================================
           */

          if (vehicleId !== null) {
            const vehicleResult = await checkVehicleAvailable(
              Number(vehicleId),
              Number(sourceTrip.routeId),
              departureDatetime,
              arrivalDatetime,
            );

            if (!vehicleResult.available) {
              throw new Error(
                vehicleResult.reason ?? "Xe không khả dụng với lịch chuyến mới",
              );
            }
          }

          /*
           * =====================================================
           * 8. NEW TRIP - CHECK DRIVER
           * =====================================================
           */

          if (driverId !== null) {
            const driverResult = await checkDriverAvailable(
              Number(driverId),
              Number(sourceTrip.routeId),
              departureDatetime,
              arrivalDatetime,
            );

            if (!driverResult.available) {
              throw new Error(
                driverResult.reason ??
                  "Tài xế không khả dụng với lịch chuyến mới",
              );
            }
          }

          /*
           * =====================================================
           * 9. SEATS
           * =====================================================
           */

          const totalSeats =
            vehicleId !== null
              ? await getVehicleTotalSeatsForCopy(Number(vehicleId))
              : 0;

          /*
           * =====================================================
           * 10. PRICE
           * =====================================================
           */

          const ticketPrice = payload.keepPrice
            ? sourceTrip.ticketPrice
            : Number(schedule.basePrice);

          /*
           * =====================================================
           * 11. CREATE TRIP
           * =====================================================
           */

          const insertResult = await createCopiedTripRepo({
            scheduleTemplateId: Number(sourceTrip.scheduleTemplateId),

            routeId: Number(sourceTrip.routeId),

            vehicleId,

            departureDatetime,

            arrivalDatetime,

            availableSeats: totalSeats,

            ticketPrice,
          });

          const newTripId = Number(insertResult.insertId);

          /*
           * =====================================================
           * 12. DRIVER
           * =====================================================
           */

          if (driverId !== null) {
            await createTripDriverRepo(newTripId, Number(driverId));
          }

          result.createdCount++;
        } catch (error) {
          result.skippedCount++;

          result.skippedItems.push({
            sourceTripId: Number(sourceTrip.tripId),

            routeId: Number(sourceTrip.routeId),

            targetDate,

            departureDatetime: `${targetDate} ${String(
              sourceTrip.departureDatetime,
            ).slice(11, 19)}`,

            reason:
              error instanceof Error
                ? error.message
                : "Không xác định được lý do",
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  return result;
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

export async function getAdminTripOptions(params: AdminTripOptionsParams) {
  return await findAdminTripOptions(params);
}
function formatTripDateTime(value: string | Date) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
export async function createAdminTrip(data: CreateAdminTripPayload) {
  /*
   * ============================================================
   * 1. VALIDATE DATETIME
   * ============================================================
   */

  const departure = new Date(data.departureDatetime);
  const arrival = new Date(data.arrivalDatetime);

  if (Number.isNaN(departure.getTime())) {
    throw new Error("Thời gian khởi hành không hợp lệ");
  }

  if (Number.isNaN(arrival.getTime())) {
    throw new Error("Thời gian đến không hợp lệ");
  }

  if (arrival <= departure) {
    throw new Error("Thời gian đến phải lớn hơn thời gian khởi hành");
  }

  /*
   * ============================================================
   * 2. KHÔNG CHO TẠO CHUYẾN TRONG QUÁ KHỨ
   * ============================================================
   */

  if (departure <= new Date()) {
    throw new Error(
      "Không thể tạo chuyến có thời gian khởi hành trong quá khứ",
    );
  }

  /*
   * ============================================================
   * 3. ROUTE PHẢI TỒN TẠI
   * ============================================================
   */

  const route = await findRouteForTrip(data.routeId);

  if (!route) {
    throw new Error("Không tìm thấy tuyến xe");
  }

  /*
   * ============================================================
   * 4. SCHEDULE TEMPLATE PHẢI THUỘC ROUTE
   * ============================================================
   */

  const template = await findScheduleTemplateForRoute({
    scheduleTemplateId: data.scheduleTemplateId,
    routeId: data.routeId,
  });

  if (!template) {
    throw new Error("Khung giờ mẫu không thuộc tuyến xe đã chọn");
  }

  /*
   * ============================================================
   * 5. GIỜ KHỞI HÀNH PHẢI KHỚP GIỜ MẪU
   *
   * Ví dụ:
   *
   * Template: 08:00
   *
   * 08:00 => OK
   * 08:05 => FAIL
   * 08:30 => FAIL
   * ============================================================
   */

  const templateDeparture = String(template.departureTime).slice(0, 5);

  const actualDeparture =
    `${String(data.departureDatetime).slice(11, 13)}:` +
    `${String(data.departureDatetime).slice(14, 16)}`;

  if (actualDeparture !== templateDeparture) {
    throw new Error(`Giờ xuất bến phải đúng giờ lịch mẫu ${templateDeparture}`);
  }

  /*
   * ============================================================
   * 6. CHECK TRÙNG CHUYẾN CÙNG ROUTE
   * ============================================================
   */

  /*
   * ============================================================
   * 7. CHECK XE
   * ============================================================
   */

  if (data.vehicleId) {
    const vehicleResult = await checkVehicleAvailable(
      data.vehicleId,
      data.routeId,
      data.departureDatetime,
      data.arrivalDatetime,
    );

    if (!vehicleResult.available) {
      throw new Error(
        vehicleResult.reason ?? "Xe không khả dụng với chuyến này",
      );
    }
  }

  /*
   * ============================================================
   * 8. CHECK TÀI XẾ
   * ============================================================
   */

  if (data.driverId) {
    const driverResult = await checkDriverAvailable(
      data.driverId,
      data.routeId,
      data.departureDatetime,
      data.arrivalDatetime,
    );

    if (!driverResult.available) {
      throw new Error(
        driverResult.reason ?? "Tài xế không khả dụng với chuyến này",
      );
    }
  }

  /*
   * ============================================================
   * 9. CREATE
   * ============================================================
   */

  return await createAdminTripRepo(data);
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildTripDatetimeFromSchedule(
  departureDate: string,
  departureTime: string,
  estimatedDuration: number,
) {
  if (
    !departureDate ||
    !departureTime ||
    estimatedDuration === null ||
    estimatedDuration === undefined
  ) {
    throw new Error("Không đủ dữ liệu để tính thời gian chuyến xe");
  }

  const dateOnly = departureDate.slice(0, 10);

  const timeOnly = departureTime.slice(0, 5);

  const departureDatetime = `${dateOnly}T${timeOnly}`;

  const departure = new Date(departureDatetime);

  if (Number.isNaN(departure.getTime())) {
    throw new Error("Thời gian xuất bến không hợp lệ");
  }

  departure.setMinutes(departure.getMinutes() + Number(estimatedDuration));

  const arrivalDatetime = `${departure.getFullYear()}-${pad(
    departure.getMonth() + 1,
  )}-${pad(departure.getDate())}T${pad(departure.getHours())}:${pad(
    departure.getMinutes(),
  )}`;

  return {
    departureDatetime,
    arrivalDatetime,
  };
}
export async function updateAdminTrip(
  tripId: number,
  data: UpdateAdminTripPayload,
) {
  /* =======================================================
   * 1. LẤY TRIP HIỆN TẠI
   * ===================================================== */

  const currentTrip = await findAdminTripById(tripId);

  if (!currentTrip) {
    throw new Error("Không tìm thấy chuyến xe");
  }

  /* =======================================================
   * 2. KIỂM TRA BOOKING
   *
   * Không cho sửa status -> CANCELLED nếu chuyến đã có booking.
   *
   * Phải dùng chức năng hủy chuyến riêng để xử lý:
   * - thông báo
   * - hoàn tiền
   * - xử lý ticket
   * ===================================================== */

  const bookingCount = await countBookingsByTrip(tripId);

  if (bookingCount > 0 && data.status === "CANCELLED") {
    throw new Error(
      "Chuyến đã có booking. Vui lòng dùng chức năng hủy chuyến có lý do để xử lý thông báo/hoàn tiền",
    );
  }

  /* =======================================================
   * 3. ROUTE CỦA CHUYẾN
   *
   * Hiện tại EDIT không cho đổi route.
   * ===================================================== */

  const routeId = Number(currentTrip.routeId);

  const route = await findRouteForTrip(routeId);

  if (!route) {
    throw new Error("Không tìm thấy tuyến xe của chuyến");
  }

  /* =======================================================
   * 4. KIỂM TRA SCHEDULE TEMPLATE
   *
   * Schedule phải thuộc đúng route của trip.
   * ===================================================== */

  const scheduleTemplateId = Number(data.scheduleTemplateId);

  if (!scheduleTemplateId) {
    throw new Error("Schedule template không hợp lệ");
  }

  const schedule = await findScheduleTemplateForRoute({
    scheduleTemplateId,
    routeId,
  });

  if (!schedule) {
    throw new Error("Lịch chạy mẫu không thuộc tuyến xe này");
  }

  /* =======================================================
   * 5. LẤY NGÀY TỪ REQUEST
   *
   * Chỉ lấy YYYY-MM-DD.
   *
   * Không tin giờ trong data.departureDatetime.
   * ===================================================== */

  const departureDate = String(data.departureDatetime).slice(0, 10);

  if (!departureDate || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
    throw new Error("Ngày xuất bến không hợp lệ");
  }

  /* =======================================================
   * 6. BACKEND TỰ TÍNH DATETIME
   *
   * departure =
   *     departureDate
   *     +
   *     schedule.departureTime
   *
   * arrival =
   *     departure
   *     +
   *     estimatedDuration
   * ===================================================== */

  const { departureDatetime, arrivalDatetime } = buildTripDatetimeFromSchedule(
    departureDate,
    String(schedule.departureTime),
    Number(schedule.estimatedDuration),
  );

  /* =======================================================
   * 7. KHÔNG CHO EDIT CHUYẾN ĐÃ BẮT ĐẦU / QUÁ KHỨ
   *
   * Nếu nghiệp vụ của bạn cho phép sửa chuyến tương lai
   * thì đây là ràng buộc cần giữ.
   * ===================================================== */

  const departure = new Date(departureDatetime);

  if (Number.isNaN(departure.getTime())) {
    throw new Error("Thời gian khởi hành sau khi tính không hợp lệ");
  }

  if (departure <= new Date()) {
    throw new Error(
      "Không thể cập nhật chuyến có thời gian khởi hành trong quá khứ",
    );
  }

  /* =======================================================
   * 8. CHECK TRÙNG CHUYẾN CÙNG ROUTE
   *
   * Quan trọng:
   *
   * tripId được truyền vào để loại chính trip đang EDIT.
   * ===================================================== */

  /* =======================================================
   * 9. CHECK XE
   *
   * Dùng checkVehicleAvailable() duy nhất.
   *
   * tripId giúp loại chính chuyến đang EDIT.
   * ===================================================== */

  if (data.vehicleId !== null && data.vehicleId !== undefined) {
    const vehicleResult = await checkVehicleAvailable(
      Number(data.vehicleId),
      routeId,
      departureDatetime,
      arrivalDatetime,
      tripId,
    );

    if (!vehicleResult.available) {
      throw new Error(
        vehicleResult.reason ?? "Xe không khả dụng với thời gian chuyến mới",
      );
    }
  }

  /* =======================================================
   * 10. CHECK TÀI XẾ
   *
   * Dùng checkDriverAvailable() duy nhất.
   * ===================================================== */

  if (data.driverId !== null && data.driverId !== undefined) {
    const driverResult = await checkDriverAvailable(
      Number(data.driverId),
      routeId,
      departureDatetime,
      arrivalDatetime,
      tripId,
    );

    if (!driverResult.available) {
      throw new Error(
        driverResult.reason ?? "Tài xế không khả dụng với thời gian chuyến mới",
      );
    }
  }

  /* =======================================================
   * 11. DATA CUỐI CÙNG
   *
   * Backend ghi đè datetime.
   *
   * Frontend gửi giờ gì cũng không quan trọng.
   * ===================================================== */
  const finalData: UpdateAdminTripPayload = {
    ...data,

    scheduleTemplateId: Number(data.scheduleTemplateId),

    departureDatetime,
    arrivalDatetime,
  };

  /* =======================================================
   * 12. UPDATE
   * ===================================================== */

  return await updateAdminTripRepo(tripId, finalData);
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
export async function getAvailableTripResources(data: {
  routeId: number;
  scheduleTemplateId: number;
  departureDatetime: string;
  arrivalDatetime: string;
  tripId?: number;
}) {
  return await findAvailableTripResources(data);
}
