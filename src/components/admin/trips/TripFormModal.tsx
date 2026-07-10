"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AdminTripItem,
  AdminTripOptionsResponse,
  CreateAdminTripPayload,
  UpdateAdminTripPayload,
  TripStatus,
} from "@/types/admin/trips/trip-management.type";
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

function toDateInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function mergeDateAndTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) return "";
  const dateOnly = dateValue.slice(0, 10);
  const timeOnly = timeValue.slice(0, 5);
  return `${dateOnly}T${timeOnly}`;
}

function addMinutesToDatetime(datetimeValue: string, minutes: number) {
  if (!datetimeValue || !minutes) return "";
  const date = new Date(datetimeValue);
  date.setMinutes(date.getMinutes() + minutes);
  return toDateInputValue(date);
}

export default function TripFormModal({
  open,
  mode,
  trip,
  options,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [routeId, setRouteId] = useState("");
  const [scheduleTemplateId, setScheduleTemplateId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [departureDatetime, setDepartureDatetime] = useState("");
  const [arrivalDatetime, setArrivalDatetime] = useState("");
  const [availableSeats, setAvailableSeats] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [status, setStatus] = useState<TripStatus>("OPEN");
  const [driverId, setDriverId] = useState("");
  const routeOptions = options?.routes ?? [];
  const vehicleOptions = options?.vehicles ?? [];
  const scheduleOptions = options?.scheduleTemplates ?? [];

  const selectedVehicle = useMemo(() => {
    return vehicleOptions.find(
      (vehicle: any) => Number(vehicle.vehicleId) === Number(vehicleId),
    );
  }, [vehicleOptions, vehicleId]);

  const filteredScheduleOptions = useMemo(() => {
    if (!routeId) return [];
    return scheduleOptions.filter(
      (item: any) => Number(item.routeId) === Number(routeId),
    );
  }, [scheduleOptions, routeId]);

  const selectedSchedule = useMemo(() => {
    return scheduleOptions.find(
      (item: any) =>
        Number(item.scheduleTemplateId) === Number(scheduleTemplateId),
    );
  }, [scheduleOptions, scheduleTemplateId]);

  // Khởi tạo/Đặt lại dữ liệu Form khi đóng/mở Modal
  useEffect(() => {
    if (!open) return;

    if (mode === "EDIT" && trip) {
      setRouteId(String(trip.routeId));
      setScheduleTemplateId(String(trip.scheduleTemplateId ?? ""));
      setVehicleId(trip.vehicleId ? String(trip.vehicleId) : "");
      setDepartureDatetime(trip.departureDatetime?.slice(0, 16) ?? "");
      setArrivalDatetime(trip.arrivalDatetime?.slice(0, 16) ?? "");
      setAvailableSeats(String(trip.availableSeats ?? ""));
      setTicketPrice(String((trip as any).ticketPrice ?? ""));
      setStatus(trip.status);
      setDriverId(
        (trip as any).mainDriverId ? String((trip as any).mainDriverId) : "",
      );
      return;
    }

    // Giá trị mặc định cho form CREATE (Ngày mặc định là hôm nay)
    setRouteId("");
    setScheduleTemplateId("");
    setVehicleId("");
    setDepartureDatetime(`${new Date().toISOString().slice(0, 10)}T00:00`);
    setArrivalDatetime("");
    setAvailableSeats("");
    setTicketPrice("");
    setStatus("OPEN");
    setDriverId("");
  }, [open, mode, trip]);

  // Tự động cập nhật số ghế khi chọn xe (Chỉ áp dụng khi tạo mới hoặc xe chưa có ai đặt)
  useEffect(() => {
    if (!selectedVehicle) return;
    if (mode === "EDIT" && trip?.bookingCount && trip.bookingCount > 0) return;

    setAvailableSeats(String(selectedVehicle.totalSeats ?? ""));
  }, [selectedVehicle, mode, trip?.bookingCount]);

  // Điền dữ liệu từ lịch chạy mẫu (CHỈ kích hoạt khi người dùng thao tác ở chế độ CREATE)
  useEffect(() => {
    if (!selectedSchedule || mode !== "CREATE") return;

    const currentDate =
      departureDatetime?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const nextDeparture = mergeDateAndTime(
      currentDate,
      selectedSchedule.departureTime,
    );

    setDepartureDatetime(nextDeparture);

    if (selectedSchedule.estimatedDuration) {
      setArrivalDatetime(
        addMinutesToDatetime(
          nextDeparture,
          Number(selectedSchedule.estimatedDuration),
        ),
      );
    }

    if (selectedSchedule.basePrice) {
      setTicketPrice(String(selectedSchedule.basePrice));
    }
  }, [selectedSchedule, mode]); // Thêm mode vào dependency để kiểm soát chặt chẽ

  // Tự động tính toán lại Giờ Đến khi người điều hành thay đổi Giờ Chạy chính thức
  useEffect(() => {
    if (!departureDatetime || !selectedSchedule?.estimatedDuration) return;

    setArrivalDatetime(
      addMinutesToDatetime(
        departureDatetime,
        Number(selectedSchedule.estimatedDuration),
      ),
    );
  }, [departureDatetime, selectedSchedule?.estimatedDuration]);

  if (!open) return null;

  const isLockedByBooking = mode === "EDIT" && !!trip && trip.bookingCount > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "CREATE" && !scheduleTemplateId) {
      alert("Tuyến này chưa chọn lịch chạy mẫu. Vui lòng tạo lịch mẫu trước.");
      return;
    }

    if (mode === "CREATE") {
      const createPayload: CreateAdminTripPayload = {
        routeId: Number(routeId),
        scheduleTemplateId: Number(scheduleTemplateId),
        vehicleId: vehicleId ? Number(vehicleId) : null,
        driverId: driverId ? Number(driverId) : null,
        departureDatetime,
        arrivalDatetime,
        availableSeats: Number(availableSeats),
        ticketPrice: ticketPrice ? Number(ticketPrice) : null,
      };
      onSubmit(createPayload);
      return;
    }
    const updatePayload: UpdateAdminTripPayload = {
      vehicleId: vehicleId ? Number(vehicleId) : null,
      driverId: driverId ? Number(driverId) : null,
      departureDatetime,
      arrivalDatetime,
      status,
      ticketPrice: ticketPrice ? Number(ticketPrice) : null,
    };
    onSubmit(updatePayload);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalNode}>
        <div className={styles.dispatchHeader}>
          <div className={styles.brandingNode}>
            <span className={styles.badgeIndicator}>THÔNG TIN CHUYẾN</span>
            <h2>
              {mode === "CREATE"
                ? "THÊM CHUYẾN XE MỚI"
                : "SỬA THÔNG TIN CHUYẾN XE"}
            </h2>
            <p>
              Chọn tuyến, lịch mẫu, gán xe. Hệ thống sẽ tự tính giờ chạy, giờ
              tới, số ghế và giá vé.
            </p>
          </div>

          <button
            type="button"
            className={styles.closeConsoleBtn}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form className={styles.dispatchForm} onSubmit={handleSubmit}>
          {/* Section 1: Tuyến & Khung giờ */}
          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>
              🗺️ Chọn tuyến đường & Lịch chạy
            </div>

            <div className={styles.formGroup}>
              <label>Tuyến đường chạy chính</label>
              <div className={styles.selectWrapper}>
                <select
                  value={routeId}
                  onChange={(e) => {
                    setRouteId(e.target.value);
                    setScheduleTemplateId("");
                    setArrivalDatetime("");
                    setTicketPrice("");
                  }}
                  required
                  disabled={isLockedByBooking}
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
                  onChange={(e) => setScheduleTemplateId(e.target.value)}
                  required
                  disabled={!routeId || isLockedByBooking}
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
                      {item.scheduleName} — Giá{" "}
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
                  lịch mẫu trong module Quản lý lịch chạy trước, rồi quay lại
                  tạo chuyến.
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Gán xe */}
          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>🚌 Gán xe cho chuyến</div>

            <div className={styles.formGroup}>
              <label>Xe chạy</label>
              <div className={styles.selectWrapper}>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                >
                  <option value="">
                    ⚠️ Để trống, sẽ bổ sung hoặc xếp xe sau
                  </option>

                  {vehicleOptions.map((vehicle: any) => (
                    <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                      {vehicle.licensePlate} — {vehicle.vehicleTypeName} —{" "}
                      {vehicle.totalSeats} ghế{" "}
                      {vehicle.status ? `[${vehicle.status}]` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedVehicle && (
              <div className={styles.criticalLockNotice}>
                <span className={styles.lockIcon}>🚌</span>
                <div className={styles.lockText}>
                  Xe được chọn là{" "}
                  <strong>{selectedVehicle.vehicleTypeName}</strong>, sức chứa{" "}
                  <strong>{selectedVehicle.totalSeats} ghế</strong>. Số ghế mở
                  bán đã tự cập nhật theo xe.
                </div>
              </div>
            )}
          </div>
          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>🪪 Gán tài xế cho chuyến</div>

            <div className={styles.formGroup}>
              <label>Tài xế chính</label>
              <div className={styles.selectWrapper}>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                >
                  <option value="">⚠️ Để trống, sẽ xếp tài xế sau</option>

                  {options?.drivers.map((driver: any) => (
                    <option
                      key={driver.driverId}
                      value={driver.driverId}
                      disabled={driver.status === "OFF"}
                    >
                      {driver.fullName} — GPLX: {driver.licenseNumber}
                      {driver.status ? ` [${driver.status}]` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {/* Section 3: Thời gian & Giá cả */}
          <div className={styles.formSection}>
            <div className={styles.sectionTitle}>⏰ Giờ chạy & Số ghế bán</div>

            <div className={styles.gridConsole2}>
              <div className={styles.formGroup}>
                <label>Giờ xuất bến chính thức</label>
                <input
                  type="datetime-local"
                  value={departureDatetime}
                  onChange={(e) => setDepartureDatetime(e.target.value)}
                  required
                  disabled={isLockedByBooking}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Giờ dự kiến tới bến</label>
                <input
                  type="datetime-local"
                  value={arrivalDatetime}
                  onChange={(e) => setArrivalDatetime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.gridConsole2}>
              <div className={styles.formGroup}>
                <label>Số lượng ghế mở bán</label>
                <input
                  type="number"
                  min={1}
                  value={availableSeats}
                  onChange={(e) => setAvailableSeats(e.target.value)}
                  required
                  disabled={isLockedByBooking}
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
                  disabled={mode === "CREATE"}
                  className={`${styles.statusSelect} ${styles[status.toLowerCase()]}`}
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

          {isLockedByBooking && (
            <div className={styles.criticalLockNotice}>
              <span className={styles.lockIcon}>🔒</span>
              <div className={styles.lockText}>
                <strong>Chuyến xe này đã có khách mua vé.</strong> Hệ thống khóa
                tuyến, giờ xuất bến và số ghế gốc để tránh lệch dữ liệu booking.
              </div>
            </div>
          )}

          {/* Footer controls */}
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
              disabled={loading}
            >
              {loading ? (
                <div className={styles.loadingFlex}>
                  <div className={styles.spinner}></div>
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
