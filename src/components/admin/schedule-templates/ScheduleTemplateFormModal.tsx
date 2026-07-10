"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  AdminScheduleTemplateItem,
  AdminScheduleTemplateOptionsResponse,
  CreateAdminScheduleTemplatePayload,
  UpdateAdminScheduleTemplatePayload,
} from "@/types/admin/schedules/schedule-management.type";

import styles from "./ScheduleTemplateFormModal.module.css";

interface Props {
  open: boolean;
  mode: "CREATE" | "EDIT";
  schedule: AdminScheduleTemplateItem | null;
  options?: AdminScheduleTemplateOptionsResponse;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (
    payload:
      | CreateAdminScheduleTemplatePayload
      | UpdateAdminScheduleTemplatePayload,
  ) => void;
}

export default function ScheduleTemplateFormModal({
  open,
  mode,
  schedule,
  options,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [routeId, setRouteId] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [basePrice, setBasePrice] = useState("");

  const routeOptions = options?.routes ?? [];

  // Tìm tên tuyến xe đang chọn để hiển thị tiêu đề nhắc nhở trực quan
  const selectedRouteName = useMemo(() => {
    return (
      routeOptions.find((route) => route.routeId === Number(routeId))
        ?.routeName ??
      schedule?.routeName ??
      ""
    );
  }, [routeOptions, routeId, schedule]);

  // Quy đổi nhanh số phút thành giờ + phút để điều hành viên dễ kiểm tra lại
  const durationTextHint = useMemo(() => {
    const minutes = Number(estimatedDuration);
    if (!minutes || minutes <= 0) return "";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h <= 0) return `(~ ${m} phút)`;
    if (m === 0) return `(~ ${h} tiếng)`;
    return `(~ ${h} tiếng ${m} phút)`;
  }, [estimatedDuration]);

  // Kiểm tra xem khung giờ mẫu này đã được áp dụng vào thực tế hay chưa
  const isUsedSchedule =
    mode === "EDIT" &&
    !!schedule &&
    (schedule.tripCount > 0 || schedule.upcomingTripCount > 0);

  useEffect(() => {
    if (!open) return;

    if (mode === "EDIT" && schedule) {
      setRouteId(String(schedule.routeId));
      setDepartureTime(schedule.departureTime);
      setEstimatedDuration(String(schedule.estimatedDuration));
      setBasePrice(String(schedule.basePrice));
      return;
    }

    setRouteId("");
    setDepartureTime("");
    setEstimatedDuration("");
    setBasePrice("");
  }, [open, mode, schedule]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "EDIT") {
      onSubmit({
        departureTime,
        estimatedDuration: Number(estimatedDuration),
        basePrice: Number(basePrice),
      });
      return;
    }

    onSubmit({
      routeId: Number(routeId),
      departureTime,
      estimatedDuration: Number(estimatedDuration),
      basePrice: Number(basePrice),
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header của Modal */}
        <div className={styles.header}>
          <div>
            <h2>
              {mode === "CREATE"
                ? "➕ Thêm khung giờ chạy mẫu"
                : "📝 Cập nhật khung giờ chạy mẫu"}
            </h2>
            <p>
              Thiết lập giờ xuất bến gốc cho nhà xe để làm cơ sở tạo danh sách
              chuyến chạy thực tế hàng ngày.
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Nội dung Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Lựa chọn Tuyến xe */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Tuyến đường vận hành <span className={styles.required}>*</span>
            </label>
            <div className={styles.selectWrapper}>
              <select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                required
                disabled={mode === "EDIT"}
                className={styles.selectInput}
              >
                <option value="">-- Chọn tuyến xe xuất phát --</option>

                {mode === "EDIT" &&
                  schedule &&
                  !routeOptions.some(
                    (route) => route.routeId === schedule.routeId,
                  ) && (
                    <option value={schedule.routeId}>
                      {schedule.routeName}
                    </option>
                  )}

                {routeOptions.map((route) => (
                  <option key={route.routeId} value={route.routeId}>
                    {route.routeName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedRouteName && (
            <div className={styles.helperText}>
              💡 Bạn đang thiết lập giờ chạy cho hành trình:{" "}
              <strong>{selectedRouteName}</strong>
            </div>
          )}

          {/* Grid thông tin chi tiết nốt chạy */}
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Giờ xuất bến gốc <span className={styles.required}>*</span>
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
                disabled={isUsedSchedule}
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Thời gian di chuyển dự kiến{" "}
                <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputUnitWrapper}>
                <input
                  type="number"
                  min={1}
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="Ví dụ: 180"
                  required
                  disabled={isUsedSchedule}
                  className={styles.inputField}
                />
                <span className={styles.inputUnitBadge}>phút</span>
              </div>
              {durationTextHint && (
                <span className={styles.durationHint}>{durationTextHint}</span>
              )}
            </div>
          </div>

          {/* Nhập giá vé */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Giá vé cơ bản <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputUnitWrapper}>
              <input
                type="number"
                min={1000}
                step={1000}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="Ví dụ: 150000"
                required
                className={styles.inputField}
              />
              <span className={styles.inputUnitBadge}>VNĐ</span>
            </div>
          </div>

          {/* Hộp thoại cảnh báo an toàn dữ liệu */}
          {isUsedSchedule && (
            <div className={styles.warningBox}>
              ⚠️ <strong>Lưu ý bảo vệ dữ liệu:</strong> Khung giờ chạy này đã
              được sử dụng để tạo lịch chạy thực tế trên hệ thống. Để tránh làm
              đảo lộn dữ liệu vận hành cũ, các thông tin về{" "}
              <em>Tuyến đường, Giờ xuất bến và Thời gian di chuyển</em> đã được
              khóa cố định. Bạn chỉ được phép điều chỉnh giá vé cơ bản tại đây.
            </div>
          )}

          {/* Nhóm nút hành động */}
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
                  <span className={styles.spinner}></span> Đang lưu thông tin...
                </span>
              ) : mode === "CREATE" ? (
                "Tạo khung giờ mẫu"
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
