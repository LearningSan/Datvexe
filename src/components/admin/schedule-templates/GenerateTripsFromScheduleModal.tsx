"use client";

import { useMemo, useState } from "react";
import type { AdminTripOptionsResponse } from "@/types/admin/trips/trip-management.type";

import type {
  GenerateTripsFromSchedulePayload,
  ScheduleGenerateRepeatType,
} from "@/types/admin/schedules/schedule-management.type";

import styles from "./GenerateTripsFromScheduleModal.module.css";

interface Props {
  open: boolean;
  options?: AdminTripOptionsResponse;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: GenerateTripsFromSchedulePayload) => void;
}

export default function GenerateTripsFromScheduleModal({
  open,
  options,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [routeId, setRouteId] = useState("");
  const [scheduleTemplateId, setScheduleTemplateId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [repeatType, setRepeatType] = useState<ScheduleGenerateRepeatType>("DAILY");
  const [vehicleId, setVehicleId] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");

  const routeOptions = options?.routes ?? [];
  const vehicleOptions = options?.vehicles ?? [];
  const scheduleOptions = options?.scheduleTemplates ?? [];

  // Lọc lịch mẫu theo tuyến xe đang chọn
  const filteredSchedules = useMemo(() => {
    if (!routeId) return [];
    return scheduleOptions.filter((item) => String(item.routeId) === String(routeId));
  }, [scheduleOptions, routeId]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      scheduleTemplateId: Number(scheduleTemplateId),
      dateFrom,
      dateTo,
      repeatType,
      vehicleId: vehicleId ? Number(vehicleId) : null,
      ticketPrice: ticketPrice ? Number(ticketPrice) : null,
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Tiêu đề Modal */}
        <div className={styles.header}>
          <div>
            <h2>⚙️ Sinh chuyến tự động</h2>
            <p>Khởi tạo danh sách chuyến xe thực tế hàng loạt dựa trên khung giờ chạy mẫu cố định.</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Form nhập liệu */}
        <form className={styles.form} onSubmit={handleSubmit}>
          
          {/* Lựa chọn Tuyến xe */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Tuyến xe vận hành <span className={styles.required}>*</span></label>
            <select
              value={routeId}
              onChange={(e) => {
                setRouteId(e.target.value);
                setScheduleTemplateId("");
              }}
              required
              className={styles.selectInput}
            >
              <option value="">-- Chọn tuyến xe cần cấu hình --</option>
              {routeOptions.map((route) => (
                <option key={route.routeId} value={route.routeId}>
                  {route.routeName}
                </option>
              ))}
            </select>
          </div>

          {/* Lựa chọn Khung giờ chạy mẫu */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Lịch chạy mẫu gốc <span className={styles.required}>*</span></label>
            <select
              value={scheduleTemplateId}
              onChange={(e) => setScheduleTemplateId(e.target.value)}
              required
              disabled={!routeId}
              className={styles.selectInput}
            >
              <option value="">
                {!routeId ? "⚠️ Vui lòng chọn tuyến xe trước" : "-- Chọn nốt chạy mẫu --"}
              </option>
              {filteredSchedules.length === 0 && routeId ? (
                <option value="" disabled>
                  ❌ Tuyến này chưa có nốt chạy mẫu nào đang hoạt động
                </option>
              ) : (
                filteredSchedules.map((item) => (
                  <option key={item.scheduleTemplateId} value={item.scheduleTemplateId}>
                    {item.scheduleName}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Cụm cấu hình thời gian chạy */}
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Từ ngày <span className={styles.required}>*</span></label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                required
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Đến ngày <span className={styles.required}>*</span></label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                required
                className={styles.inputField}
              />
            </div>
          </div>

          {/* Kiểu lặp lịch */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Tần suất lặp (Kiểu lặp) <span className={styles.required}>*</span></label>
            <select
              value={repeatType}
              onChange={(e) => setRepeatType(e.target.value as ScheduleGenerateRepeatType)}
              className={styles.selectInput}
            >
              <option value="DAILY">🔄 Hằng ngày (Tất cả các ngày)</option>
              <option value="WEEKLY">📅 Hằng tuần (Theo ngày chỉ định)</option>
              <option value="WEEKDAYS">💼 Ngày trong tuần (Thứ 2 - Thứ 6)</option>
              <option value="WEEKENDS">🏖️ Ngày cuối tuần (Thứ 7 & Chủ Nhật)</option>
            </select>
          </div>

          {/* Cấu hình Xe & Giá vé */}
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Xe vận hành mặc định</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className={styles.selectInput}
              >
                <option value="">-- Chưa gán xe (Bổ sung sau) --</option>
                {vehicleOptions.map((vehicle) => (
                  <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                    {vehicle.licensePlate} ({vehicle.vehicleTypeName})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Giá vé áp dụng thực tế</label>
              <div className={styles.inputUnitWrapper}>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  placeholder="Mặc định theo giá mẫu"
                  className={styles.inputField}
                />
                <span className={styles.inputUnitBadge}>VNĐ</span>
              </div>
            </div>
          </div>

          {/* Hộp nhắc nhở quy tắc */}
          <div className={styles.noteBox}>
            ℹ️ <strong>Quy tắc hệ thống:</strong> Các ngày trùng khít hoàn toàn về tuyến và giờ khởi hành có sẵn sẽ tự động được bỏ qua nhằm phòng tránh xung đột dữ liệu nốt chạy bến bãi.
          </div>

          {/* Thanh hành động */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.loadingFlex}>
                  <span className={styles.spinner}></span> Đang khởi tạo...
                </span>
              ) : (
                "Bắt đầu sinh chuyến"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}