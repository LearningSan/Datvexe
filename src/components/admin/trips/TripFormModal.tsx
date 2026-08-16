"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  AdminTripItem,
  AdminTripOptionsResponse,
  CreateAdminTripPayload,
  UpdateAdminTripPayload,
  TripStatus,
} from "@/types/admin/trips/trip-management.type";

import { useAvailableTripResources } from "@/hooks/admin/useTrips";

import styles from "./TripFormModal.module.css";

interface Props {
  open: boolean;
  mode: "CREATE" | "EDIT";
  trip: AdminTripItem | null;
  options?: AdminTripOptionsResponse;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAdminTripPayload | UpdateAdminTripPayload) => void;
}

/* =========================================================
 * DATE / TIME HELPERS
 * ======================================================= */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getLocalDateFromISOString(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}`;
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getTodayLocal() {
  const now = new Date();

  return `${now.getFullYear()}-${pad(
    now.getMonth() + 1,
  )}-${pad(now.getDate())}`;
}

/**
 * Ghép ngày + giờ của schedule template
 *
 * Ví dụ:
 * date = 2026-08-15
 * time = 08:00:00
 *
 * => 2026-08-15T08:00
 */
function mergeDateAndTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return "";
  }

  const dateOnly = dateValue.slice(0, 10);
  const timeOnly = timeValue.slice(0, 5);

  return `${dateOnly}T${timeOnly}`;
}

/**
 * Tính arrival từ departure + estimatedDuration
 */
function addMinutesToDatetime(datetimeValue: string, minutes: number) {
  if (!datetimeValue || !minutes) {
    return "";
  }

  const date = new Date(datetimeValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setMinutes(date.getMinutes() + Number(minutes));

  return toDateInputValue(date);
}

/* =========================================================
 * COMPONENT
 * ======================================================= */

export default function TripFormModal({
  open,
  mode,
  trip,
  options,
  loading = false,
  onClose,
  onSubmit,
}: Props) {
  /* =======================================================
   * FORM STATE
   * ===================================================== */

  const [routeId, setRouteId] = useState("");

  const [scheduleTemplateId, setScheduleTemplateId] = useState("");

  const [vehicleId, setVehicleId] = useState("");

  const [driverId, setDriverId] = useState("");

  /**
   * Admin CHỈ chọn ngày.
   *
   * Không có departureTime state.
   * Không có input giờ thủ công.
   */
  const [departureDate, setDepartureDate] = useState("");

  /**
   * Hai field này chỉ là kết quả được tính tự động.
   */
  const [departureDatetime, setDepartureDatetime] = useState("");

  const [arrivalDatetime, setArrivalDatetime] = useState("");

  const [availableSeats, setAvailableSeats] = useState("");

  const [ticketPrice, setTicketPrice] = useState("");

  const [status, setStatus] = useState<TripStatus>("OPEN");

  /* =======================================================
   * OPTIONS
   * ===================================================== */

  const routeOptions = options?.routes ?? [];

  const scheduleOptions = options?.scheduleTemplates ?? [];

  /* =======================================================
   * SELECTED ROUTE
   * ===================================================== */

  const selectedRoute = useMemo(() => {
    if (!routeId) {
      return undefined;
    }

    return routeOptions.find(
      (route: any) => Number(route.routeId) === Number(routeId),
    );
  }, [routeOptions, routeId]);

  /* =======================================================
   * SCHEDULE FILTER THEO ROUTE
   * ======================================================= */

  const filteredScheduleOptions = useMemo(() => {
    if (!selectedRoute) {
      return [];
    }

    return scheduleOptions.filter(
      (item: any) =>
        Number(item.originCityId) === Number(selectedRoute.originCityId) &&
        Number(item.destinationCityId) ===
          Number(selectedRoute.destinationCityId),
    );
  }, [scheduleOptions, selectedRoute]);

  /* =======================================================
   * SELECTED SCHEDULE
   * ======================================================= */

  const selectedSchedule = useMemo(() => {
    if (!scheduleTemplateId) {
      return undefined;
    }

    return scheduleOptions.find(
      (item: any) =>
        Number(item.scheduleTemplateId) === Number(scheduleTemplateId),
    );
  }, [scheduleOptions, scheduleTemplateId]);

  /* =======================================================
   * TÍNH GIỜ TỪ SCHEDULE TEMPLATE
   *
   * Đây là logic trung tâm của form.
   *
   * departureDate
   *       +
   * schedule.departureTime
   *       ↓
   * departureDatetime
   *       +
   * schedule.estimatedDuration
   *       ↓
   * arrivalDatetime
   * ===================================================== */

  const syncTimeFromSchedule = (date: string, schedule: any) => {
    if (!date || !schedule) {
      setDepartureDatetime("");
      setArrivalDatetime("");

      return;
    }

    const departure = mergeDateAndTime(date, schedule.departureTime);

    setDepartureDatetime(departure);

    if (
      schedule.estimatedDuration !== null &&
      schedule.estimatedDuration !== undefined
    ) {
      const arrival = addMinutesToDatetime(
        departure,
        Number(schedule.estimatedDuration),
      );

      setArrivalDatetime(arrival);
    } else {
      setArrivalDatetime("");
    }
  };

  /* =======================================================
   * RESOURCE CHECK
   * ======================================================= */

  const canCheckResources =
    open &&
    !!routeId &&
    !!scheduleTemplateId &&
    !!departureDate &&
    !!departureDatetime &&
    !!arrivalDatetime;

  const {
    data: availableResources,
    isLoading: isLoadingResources,
    isFetching: isFetchingResources,
  } = useAvailableTripResources({
    routeId: canCheckResources ? Number(routeId) : undefined,

    scheduleTemplateId: canCheckResources
      ? Number(scheduleTemplateId)
      : undefined,

    departureDatetime: canCheckResources ? departureDatetime : undefined,

    arrivalDatetime: canCheckResources ? arrivalDatetime : undefined,

    tripId: mode === "EDIT" && trip?.tripId ? Number(trip.tripId) : undefined,
  });

  const availableVehicleOptions = useMemo(() => {
    return availableResources?.vehicles ?? [];
  }, [availableResources?.vehicles]);

  const availableDriverOptions = useMemo(() => {
    return availableResources?.drivers ?? [];
  }, [availableResources?.drivers]);

  /* =======================================================
   * SELECTED VEHICLE
   * ======================================================= */

  const selectedVehicle = useMemo(() => {
    if (!vehicleId) {
      return undefined;
    }

    return availableVehicleOptions.find(
      (vehicle: any) => Number(vehicle.vehicleId) === Number(vehicleId),
    );
  }, [availableVehicleOptions, vehicleId]);

  /* =======================================================
   * RESOURCE OPTIONS
   * ======================================================= */

  const vehicleSelectOptions = availableVehicleOptions;

  const driverSelectOptions = availableDriverOptions;

  /* =======================================================
   * CHECK SELECTED RESOURCE
   * ======================================================= */

  const selectedVehicleIsUnavailable =
    mode === "EDIT" &&
    !!vehicleId &&
    canCheckResources &&
    !isLoadingResources &&
    !isFetchingResources &&
    !availableVehicleOptions.some(
      (vehicle: any) => Number(vehicle.vehicleId) === Number(vehicleId),
    );

  const selectedDriverIsUnavailable =
    mode === "EDIT" &&
    !!driverId &&
    canCheckResources &&
    !isLoadingResources &&
    !isFetchingResources &&
    !availableDriverOptions.some(
      (driver: any) => Number(driver.driverId) === Number(driverId),
    );

  /* =======================================================
   * BOOKING LOCK
   * ======================================================= */

  const isLockedByBooking =
    mode === "EDIT" && !!trip && Number(trip.bookingCount ?? 0) > 0;

  /* =======================================================
   * INIT FORM
   * ======================================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    /* =====================================================
     * EDIT
     * =================================================== */

    if (mode === "EDIT" && trip) {
      const nextRouteId = String(trip.routeId);

      setRouteId(nextRouteId);

      const departure = trip.departureDatetime
        ? new Date(String(trip.departureDatetime))
        : null;

      const route = routeOptions.find(
        (item: any) => Number(item.routeId) === Number(trip.routeId),
      );

      const actualDepartureTime =
        departure && !Number.isNaN(departure.getTime())
          ? `${pad(departure.getHours())}:${pad(departure.getMinutes())}`
          : "";

      /**
       * Tìm schedule template tương ứng
       * với route + giờ xuất bến hiện tại.
       */
      const matchedSchedule = scheduleOptions.find(
        (item: any) =>
          String(item.departureTime).slice(0, 5) === actualDepartureTime &&
          Number(item.originCityId) === Number(route?.originCityId) &&
          Number(item.destinationCityId) === Number(route?.destinationCityId),
      );

      const nextScheduleId = matchedSchedule
        ? String(matchedSchedule.scheduleTemplateId)
        : "";

      setScheduleTemplateId(nextScheduleId);

      /**
       * Chỉ lấy NGÀY từ trip cũ.
       *
       * Không lấy giờ cũ.
       */
      const nextDepartureDate =
        departure && !Number.isNaN(departure.getTime())
          ? getLocalDateFromISOString(String(trip.departureDatetime))
          : "";

      setDepartureDate(nextDepartureDate);

      /**
       * TÍNH LẠI GIỜ TỪ SCHEDULE.
       *
       * Không dùng giờ cũ của trip.
       */
      if (matchedSchedule && nextDepartureDate) {
        syncTimeFromSchedule(nextDepartureDate, matchedSchedule);
      } else {
        setDepartureDatetime("");
        setArrivalDatetime("");
      }

      setVehicleId(trip.vehicleId ? String(trip.vehicleId) : "");

      setDriverId(
        (trip as any).mainDriverId ? String((trip as any).mainDriverId) : "",
      );

      setAvailableSeats(String(trip.availableSeats ?? ""));

      setTicketPrice(String(trip.ticketPrice ?? ""));

      setStatus(trip.status);

      return;
    }

    /* =====================================================
     * CREATE
     * =================================================== */

    setRouteId("");
    setScheduleTemplateId("");
    setVehicleId("");
    setDriverId("");

    const today = getTodayLocal();

    setDepartureDate(today);

    setDepartureDatetime("");
    setArrivalDatetime("");

    setAvailableSeats("");
    setTicketPrice("");

    setStatus("OPEN");
  }, [open, mode, trip, scheduleOptions, routeOptions]);

  /* =======================================================
   * AUTO SET SEAT COUNT
   * ======================================================= */

  useEffect(() => {
    if (!selectedVehicle) {
      return;
    }

    if (isLockedByBooking) {
      return;
    }

    setAvailableSeats(String(selectedVehicle.totalSeats ?? ""));
  }, [selectedVehicle, isLockedByBooking]);

  /* =======================================================
   * SCHEDULE CHANGE
   * ======================================================= */

  const handleScheduleChange = (nextScheduleId: string) => {
    setScheduleTemplateId(nextScheduleId);

    const schedule = scheduleOptions.find(
      (item: any) => Number(item.scheduleTemplateId) === Number(nextScheduleId),
    );

    /**
     * Đổi schedule => xe/tài xế cũ
     * cần được kiểm tra lại.
     */
    setVehicleId("");
    setDriverId("");

    if (!schedule || !departureDate) {
      setDepartureDatetime("");
      setArrivalDatetime("");

      return;
    }

    /**
     * QUAN TRỌNG:
     * giờ LUÔN lấy từ schedule.
     */
    syncTimeFromSchedule(departureDate, schedule);

    if (schedule.basePrice !== null && schedule.basePrice !== undefined) {
      setTicketPrice(String(schedule.basePrice));
    }
  };

  /* =======================================================
   * ROUTE CHANGE
   * ======================================================= */

  const handleRouteChange = (nextRouteId: string) => {
    setRouteId(nextRouteId);

    setScheduleTemplateId("");

    setVehicleId("");
    setDriverId("");

    setDepartureDatetime("");
    setArrivalDatetime("");

    setTicketPrice("");
  };

  /* =======================================================
   * DATE CHANGE
   * ======================================================= */

  const handleDepartureDateChange = (nextDate: string) => {
    if (!nextDate) {
      setDepartureDate("");

      setDepartureDatetime("");
      setArrivalDatetime("");

      return;
    }

    setDepartureDate(nextDate);

    if (!selectedSchedule) {
      setDepartureDatetime("");
      setArrivalDatetime("");

      return;
    }

    /**
     * Đổi ngày => giờ vẫn lấy từ schedule.
     */
    syncTimeFromSchedule(nextDate, selectedSchedule);
  };

  /* =======================================================
   * VEHICLE CHANGE
   * ======================================================= */

  const handleVehicleChange = (nextVehicleId: string) => {
    setVehicleId(nextVehicleId);

    if (!nextVehicleId) {
      if (!isLockedByBooking) {
        setAvailableSeats("");
      }

      return;
    }

    const vehicle = vehicleSelectOptions.find(
      (item: any) => Number(item.vehicleId) === Number(nextVehicleId),
    );

    if (vehicle && !isLockedByBooking) {
      setAvailableSeats(String(vehicle.totalSeats ?? ""));
    }
  };

  /* =======================================================
   * DRIVER CHANGE
   * ======================================================= */

  const handleDriverChange = (nextDriverId: string) => {
    setDriverId(nextDriverId);
  };

  /* =======================================================
   * SUBMIT
   * ======================================================= */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!routeId) {
      alert("Vui lòng chọn tuyến xe.");
      return;
    }

    if (!scheduleTemplateId) {
      alert("Vui lòng chọn lịch chạy mẫu.");
      return;
    }

    if (!departureDate) {
      alert("Vui lòng chọn ngày xuất bến.");
      return;
    }

    if (!selectedSchedule) {
      alert("Không tìm thấy lịch chạy mẫu đã chọn.");
      return;
    }

    /**
     * LUÔN TÍNH LẠI Ở THỜI ĐIỂM SUBMIT.
     *
     * Không tin state cũ.
     */
    const calculatedDeparture = mergeDateAndTime(
      departureDate,
      selectedSchedule.departureTime,
    );

    const calculatedArrival = addMinutesToDatetime(
      calculatedDeparture,
      Number(selectedSchedule.estimatedDuration),
    );

    if (!calculatedDeparture || !calculatedArrival) {
      alert("Không thể tính thời gian chuyến xe.");
      return;
    }

    const departure = new Date(calculatedDeparture);

    const arrival = new Date(calculatedArrival);

    if (Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime())) {
      alert("Thời gian chuyến xe không hợp lệ.");
      return;
    }

    if (arrival <= departure) {
      alert("Giờ tới phải sau giờ xuất bến.");
      return;
    }

    if (!ticketPrice) {
      alert("Vui lòng nhập giá vé.");
      return;
    }

    if (canCheckResources && selectedVehicleIsUnavailable) {
      alert("Xe hiện tại không khả dụng với thời gian chuyến mới.");
      return;
    }

    if (canCheckResources && selectedDriverIsUnavailable) {
      alert("Tài xế hiện tại không khả dụng với thời gian chuyến mới.");
      return;
    }

    /* =====================================================
     * CREATE
     * =================================================== */

    if (mode === "CREATE") {
      const createPayload: CreateAdminTripPayload = {
        routeId: Number(routeId),

        scheduleTemplateId: Number(scheduleTemplateId),

        vehicleId: vehicleId ? Number(vehicleId) : null,

        driverId: driverId ? Number(driverId) : null,

        departureDatetime: calculatedDeparture,

        arrivalDatetime: calculatedArrival,

        ticketPrice: ticketPrice ? Number(ticketPrice) : null,
      };

      onSubmit(createPayload);

      return;
    }

    /* =====================================================
     * EDIT
     * =================================================== */

    if (!trip?.tripId) {
      alert("Không xác định được chuyến xe cần cập nhật.");
      return;
    }

    const updatePayload: UpdateAdminTripPayload = {
      /**
       * BỔ SUNG:
       * Backend cần biết schedule mới.
       */
      scheduleTemplateId: Number(scheduleTemplateId),

      vehicleId: vehicleId ? Number(vehicleId) : null,

      driverId: driverId ? Number(driverId) : null,

      /**
       * Frontend gửi giá trị đã tính.
       *
       * Backend vẫn phải tính lại.
       */
      departureDatetime: calculatedDeparture,

      arrivalDatetime: calculatedArrival,

      status,

      ticketPrice: ticketPrice ? Number(ticketPrice) : null,
    };

    onSubmit(updatePayload);
  };

  /* =======================================================
   * RENDER
   * ======================================================= */

  if (!open) {
    return null;
  }

  const resourceLoading = isLoadingResources || isFetchingResources;

  const cannotSubmit =
    loading ||
    (canCheckResources && resourceLoading) ||
    selectedVehicleIsUnavailable ||
    selectedDriverIsUnavailable;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalNode}>
        {/* =================================================
         * HEADER
         * =============================================== */}

        <div className={styles.dispatchHeader}>
          <div className={styles.brandingNode}>
            <span className={styles.badgeIndicator}>THÔNG TIN CHUYẾN</span>

            <h2>
              {mode === "CREATE"
                ? "THÊM CHUYẾN XE MỚI"
                : "SỬA THÔNG TIN CHUYẾN XE"}
            </h2>

            <p>
              Chọn tuyến, lịch mẫu, ngày chạy, xe và tài xế. Giờ xuất bến và giờ
              tới được tự động tính theo lịch mẫu.
            </p>
          </div>

          <button
            type="button"
            className={styles.closeConsoleBtn}
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form className={styles.dispatchForm} onSubmit={handleSubmit}>
          {/* =================================================
           * ROUTE + SCHEDULE
           * =============================================== */}

          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>
              🗺️ Chọn tuyến đường & lịch chạy
            </div>

            <div className={styles.formGroup}>
              <label>Tuyến đường chạy chính</label>

              <div className={styles.selectWrapper}>
                <select
                  value={routeId}
                  onChange={(e) => handleRouteChange(e.target.value)}
                  required
                  disabled={isLockedByBooking || loading}
                >
                  <option value="">-- Chọn tuyến xe chạy --</option>

                  {routeOptions.map((route: any) => (
                    <option key={route.routeId} value={route.routeId}>
                      {route.routeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Khung giờ / Lịch chạy mẫu</label>

              <div className={styles.selectWrapper}>
                <select
                  value={scheduleTemplateId}
                  onChange={(e) => handleScheduleChange(e.target.value)}
                  required
                  disabled={!routeId || isLockedByBooking || loading}
                >
                  <option value="">
                    {!routeId
                      ? "⚠️ Vui lòng chọn tuyến trước"
                      : filteredScheduleOptions.length === 0
                        ? "⚠️ Tuyến này chưa có lịch chạy mẫu"
                        : "-- Chọn khung giờ mẫu --"}
                  </option>

                  {filteredScheduleOptions.map((item: any) => (
                    <option
                      key={item.scheduleTemplateId}
                      value={item.scheduleTemplateId}
                    >
                      {item.scheduleName} —{" "}
                      {String(item.departureTime).slice(0, 5)} — Giá{" "}
                      {Number(item.basePrice).toLocaleString("vi-VN")}đ
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {routeId && filteredScheduleOptions.length === 0 && (
              <div className={styles.criticalLockNotice}>
                <span className={styles.lockIcon}>⚠️</span>

                <div className={styles.lockText}>
                  <strong>Tuyến này chưa có lịch chạy mẫu.</strong> Bạn cần tạo
                  lịch mẫu trước.
                </div>
              </div>
            )}
          </div>

          {/* =================================================
           * TIME
           * =============================================== */}

          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>⏰ Thời gian chuyến xe</div>

            <div className={styles.gridConsole2}>
              <div className={styles.formGroup}>
                <label>Ngày xuất bến</label>

                <input
                  type="date"
                  className={styles.datetimeInput}
                  value={departureDate}
                  onChange={(e) => handleDepartureDateChange(e.target.value)}
                  required
                  disabled={isLockedByBooking || loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Giờ theo lịch mẫu</label>

                <input
                  type="text"
                  className={styles.datetimeInput}
                  value={
                    selectedSchedule?.departureTime
                      ? String(selectedSchedule.departureTime).slice(0, 5)
                      : ""
                  }
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div className={styles.gridConsole2}>
              <div className={styles.formGroup}>
                <label>Giờ xuất bến</label>

                <input
                  type="datetime-local"
                  className={styles.datetimeInput}
                  value={departureDatetime}
                  readOnly
                  disabled
                />
              </div>

              <div className={styles.formGroup}>
                <label>Giờ dự kiến tới bến</label>

                <input
                  type="datetime-local"
                  className={styles.datetimeInput}
                  value={arrivalDatetime}
                  readOnly
                  disabled
                />
              </div>
            </div>

            <div className={styles.criticalLockNotice}>
              <span className={styles.lockIcon}>🕐</span>

              <div className={styles.lockText}>
                Giờ xuất bến và giờ tới được tự động tính theo{" "}
                <strong>lịch chạy mẫu</strong>. Không thể nhập thủ công.
              </div>
            </div>
          </div>

          {/* =================================================
           * VEHICLE
           * =============================================== */}

          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>🚌 Gán xe cho chuyến</div>

            <div className={styles.formGroup}>
              <label>Xe chạy</label>

              <div className={styles.selectWrapper}>
                <select
                  value={vehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  disabled={!canCheckResources || loading || resourceLoading}
                >
                  <option value="">
                    {!canCheckResources
                      ? "⚠️ Nhập đủ thông tin thời gian trước"
                      : resourceLoading
                        ? "⏳ Đang kiểm tra xe khả dụng..."
                        : "⚠️ Để trống, sẽ xếp xe sau"}
                  </option>

                  {vehicleSelectOptions.map((vehicle: any) => (
                    <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                      {vehicle.licensePlate} — {vehicle.vehicleTypeName} —{" "}
                      {vehicle.totalSeats} ghế
                      {vehicle.status ? ` [${vehicle.status}]` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedVehicleIsUnavailable && (
              <div className={styles.criticalLockNotice}>
                <span className={styles.lockIcon}>⚠️</span>

                <div className={styles.lockText}>
                  <strong>Xe hiện tại không còn khả dụng.</strong> Vui lòng chọn
                  xe khác.
                </div>
              </div>
            )}

            {canCheckResources &&
              !resourceLoading &&
              vehicleSelectOptions.length === 0 && (
                <div className={styles.criticalLockNotice}>
                  <span className={styles.lockIcon}>⚠️</span>

                  <div className={styles.lockText}>
                    <strong>Không có xe khả dụng.</strong> Xe có thể đang chạy
                    chuyến khác hoặc chưa đủ thời gian quay đầu.
                  </div>
                </div>
              )}

            {selectedVehicle && (
              <div className={styles.criticalLockNotice}>
                <span className={styles.lockIcon}>🚌</span>

                <div className={styles.lockText}>
                  Xe được chọn là{" "}
                  <strong>{selectedVehicle.vehicleTypeName}</strong>, sức chứa{" "}
                  <strong>{selectedVehicle.totalSeats} ghế</strong>.
                </div>
              </div>
            )}
          </div>

          {/* =================================================
           * DRIVER
           * =============================================== */}

          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>🪪 Gán tài xế cho chuyến</div>

            <div className={styles.formGroup}>
              <label>Tài xế chính</label>

              <div className={styles.selectWrapper}>
                <select
                  value={driverId}
                  onChange={(e) => handleDriverChange(e.target.value)}
                  disabled={!canCheckResources || loading || resourceLoading}
                >
                  <option value="">
                    {!canCheckResources
                      ? "⚠️ Nhập đủ thông tin thời gian trước"
                      : resourceLoading
                        ? "⏳ Đang kiểm tra tài xế khả dụng..."
                        : "⚠️ Để trống, sẽ xếp tài xế sau"}
                  </option>

                  {driverSelectOptions.map((driver: any) => (
                    <option
                      key={driver.driverId}
                      value={driver.driverId}
                      disabled={driver.status === "OFF"}
                    >
                      {driver.fullName}
                      {" — GPLX: "}
                      {driver.licenseNumber}
                      {driver.status ? ` [${driver.status}]` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedDriverIsUnavailable && (
              <div className={styles.criticalLockNotice}>
                <span className={styles.lockIcon}>⚠️</span>

                <div className={styles.lockText}>
                  <strong>Tài xế hiện tại không còn khả dụng.</strong> Vui lòng
                  chọn tài xế khác.
                </div>
              </div>
            )}

            {canCheckResources &&
              !resourceLoading &&
              driverSelectOptions.length === 0 && (
                <div className={styles.criticalLockNotice}>
                  <span className={styles.lockIcon}>⚠️</span>

                  <div className={styles.lockText}>
                    <strong>Không có tài xế khả dụng.</strong> Có thể tài xế
                    đang chạy chuyến khác hoặc chưa đủ thời gian nghỉ.
                  </div>
                </div>
              )}
          </div>

          {/* =================================================
           * SEAT + PRICE + STATUS
           * =============================================== */}

          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>🎫 Số ghế & Giá vé</div>

            <div className={styles.gridConsole2}>
              <div className={styles.formGroup}>
                <label>Số lượng ghế mở bán</label>

                <input
                  type="number"
                  min={1}
                  value={availableSeats}
                  onChange={(e) => setAvailableSeats(e.target.value)}
                  required
                  disabled={isLockedByBooking || loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Giá vé (đ)</label>

                <input
                  type="number"
                  min={0}
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Tự lấy từ lịch mẫu"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Trạng thái chuyến xe</label>

              <div className={styles.selectWrapper}>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TripStatus)}
                  disabled={mode === "CREATE" || loading}
                  className={`${styles.statusSelect} ${
                    styles[status.toLowerCase()]
                  }`}
                >
                  <option value="OPEN">🟢 Đang mở bán vé</option>

                  <option value="FULL">🔴 Khóa sổ, hết ghế</option>

                  <option value="RUNNING">🟡 Xe đang chạy</option>

                  <option value="COMPLETED">⚪ Đã hoàn thành</option>

                  <option value="CANCELLED">❌ Hủy chuyến xe</option>
                </select>
              </div>
            </div>
          </div>

          {/* =================================================
           * BOOKING LOCK
           * =============================================== */}

          {isLockedByBooking && (
            <div className={styles.criticalLockNotice}>
              <span className={styles.lockIcon}>🔒</span>

              <div className={styles.lockText}>
                <strong>Chuyến xe này đã có khách mua vé.</strong> Hệ thống khóa
                tuyến, lịch mẫu, ngày chạy và số ghế gốc để tránh lệch dữ liệu
                booking. Xe và tài xế vẫn có thể thay đổi nếu khả dụng.
              </div>
            </div>
          )}

          {/* =================================================
           * RESOURCE LOADING
           * =============================================== */}

          {canCheckResources && resourceLoading && (
            <div className={styles.criticalLockNotice}>
              <span className={styles.lockIcon}>⏳</span>

              <div className={styles.lockText}>
                Hệ thống đang kiểm tra xe và tài xế có đáp ứng điều kiện quay
                đầu và thời gian nghỉ hay không...
              </div>
            </div>
          )}

          {/* =================================================
           * FOOTER
           * =============================================== */}

          <div className={styles.controlFooter}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={onClose}
              disabled={loading}
            >
              Quay lại
            </button>

            <button
              type="submit"
              className={styles.dispatchConfirmBtn}
              disabled={cannotSubmit}
            >
              {loading ? (
                <div className={styles.loadingFlex}>
                  <div className={styles.spinner} />

                  <span>Đang lưu...</span>
                </div>
              ) : mode === "CREATE" ? (
                "Tạo chuyến xe"
              ) : (
                "Xác nhận cập nhật"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
