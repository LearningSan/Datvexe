"use client";

import { useMemo, useState } from "react";

import type {
  AdminTripOptionsResponse,
  CopyTripsPayload,
} from "@/types/admin/trips/trip-management.type";

import styles from "./CopyTripsModal.module.css";

interface Props {
  open: boolean;
  options?: AdminTripOptionsResponse;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: CopyTripsPayload) => void;
}

function shiftDate(baseDate: string, days: number) {
  if (!baseDate) return "";
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function CopyTripsModal({
  open,
  options,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [copyMode, setCopyMode] = useState<
    "YESTERDAY" | "LAST_WEEK" | "LAST_MONTH" | "CUSTOM"
  >("CUSTOM");

  const [copyTargetMode, setCopyTargetMode] = useState<"SINGLE" | "RANGE">(
    "SINGLE",
  );

  const [sourceDate, setSourceDate] = useState(shiftDate(today, -1));
  const [targetDateFrom, setTargetDateFrom] = useState(today);
  const [targetDateTo, setTargetDateTo] = useState(today);

  const [routeId, setRouteId] = useState("");
  const [keepVehicle, setKeepVehicle] = useState(true);
  const [keepPrice, setKeepPrice] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  if (!open) return null;

  const handleModeChange = (mode: typeof copyMode) => {
    setCopyMode(mode);

    if (mode === "YESTERDAY") setSourceDate(shiftDate(targetDateFrom, -1));
    if (mode === "LAST_WEEK") setSourceDate(shiftDate(targetDateFrom, -7));
    if (mode === "LAST_MONTH") setSourceDate(shiftDate(targetDateFrom, -30));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      sourceDate,
      targetDateFrom,
      targetDateTo: copyTargetMode === "SINGLE" ? targetDateFrom : targetDateTo,
      routeId: routeId ? Number(routeId) : undefined,
      keepVehicle,
      keepPrice,
      overwriteExisting,
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>📋 Sao chép lịch trình chuyến xe</h2>
            <p>
              Nhân bản nhanh toàn bộ cấu trúc chuyến chạy từ một ngày có sẵn
              sang ngày hoặc khoảng ngày mong muốn.
            </p>
          </div>

          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Cấu hình ngày nguồn</label>
            <select
              value={copyMode}
              onChange={(e) => handleModeChange(e.target.value as any)}
              className={styles.selectInput}
            >
              <option value="YESTERDAY">⏱️ Lấy ngày hôm trước làm mẫu</option>
              <option value="LAST_WEEK">
                📅 Lấy cùng thứ tuần trước làm mẫu
              </option>
              <option value="LAST_MONTH">
                🗓️ Lấy cùng ngày tháng trước làm mẫu
              </option>
              <option value="CUSTOM">⚙️ Tự chọn ngày mẫu</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Ngày mẫu <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              value={sourceDate}
              onChange={(e) => {
                setSourceDate(e.target.value);
                setCopyMode("CUSTOM");
              }}
              required
              className={styles.inputField}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Kiểu sao chép</label>
            <select
              value={copyTargetMode}
              onChange={(e) => {
                const value = e.target.value as "SINGLE" | "RANGE";
                setCopyTargetMode(value);

                if (value === "SINGLE") {
                  setTargetDateTo(targetDateFrom);
                }
              }}
              className={styles.selectInput}
            >
              <option value="SINGLE">📋 Sao chép sang 1 ngày cụ thể</option>
              <option value="RANGE">📅 Sao chép sang khoảng ngày</option>
            </select>
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {copyTargetMode === "SINGLE"
                  ? "Ngày cần tạo"
                  : "Từ ngày áp dụng"}
                <span className={styles.required}> *</span>
              </label>

              <input
                type="date"
                value={targetDateFrom}
                onChange={(e) => {
                  const value = e.target.value;

                  setTargetDateFrom(value);

                  if (copyTargetMode === "SINGLE") {
                    setTargetDateTo(value);
                  }

                  if (
                    copyTargetMode === "RANGE" &&
                    (!targetDateTo || new Date(targetDateTo) < new Date(value))
                  ) {
                    setTargetDateTo(value);
                  }

                  if (copyMode === "YESTERDAY") {
                    setSourceDate(shiftDate(value, -1));
                  }

                  if (copyMode === "LAST_WEEK") {
                    setSourceDate(shiftDate(value, -7));
                  }

                  if (copyMode === "LAST_MONTH") {
                    setSourceDate(shiftDate(value, -30));
                  }
                }}
                required
                className={styles.inputField}
              />
            </div>

            {copyTargetMode === "RANGE" && (
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Đến ngày áp dụng <span className={styles.required}>*</span>
                </label>

                <input
                  type="date"
                  value={targetDateTo}
                  min={targetDateFrom}
                  onChange={(e) => setTargetDateTo(e.target.value)}
                  required
                  className={styles.inputField}
                />
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Phạm vi áp dụng tuyến</label>
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">🌍 Sao chép tất cả các tuyến đang chạy</option>

              {options?.routes.map((route) => (
                <option key={route.routeId} value={route.routeId}>
                  {route.routeName}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={keepVehicle}
                onChange={(e) => setKeepVehicle(e.target.checked)}
                className={styles.checkboxInput}
              />

              <span className={styles.checkboxLabel}>
                <strong>Giữ nguyên xe vận hành:</strong> Bê nguyên biển số xe
                đang gán từ ngày mẫu sang ngày mới.
              </span>
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={keepPrice}
                onChange={(e) => setKeepPrice(e.target.checked)}
                className={styles.checkboxInput}
              />

              <span className={styles.checkboxLabel}>
                <strong>Giữ nguyên biểu giá vé:</strong> Kế thừa toàn bộ mức giá
                của các chuyến ngày mẫu.
              </span>
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => {
                  const checked = e.target.checked;

                  if (checked) {
                    const ok = window.confirm(
                      "Cảnh báo: Ghi đè sẽ cập nhật lại các chuyến đã tồn tại nhưng chưa có booking. Các chuyến đã có khách đặt sẽ bị bỏ qua để tránh sai dữ liệu. Bạn có chắc muốn bật không?",
                    );

                    if (!ok) return;
                  }

                  setOverwriteExisting(checked);
                }}
                className={styles.checkboxInput}
              />

              <span className={styles.checkboxLabel}>
                <strong>Ghi đè chuyến đã tồn tại:</strong> Cập nhật lại xe, số
                ghế trống và giá vé cho các chuyến chưa có booking.
              </span>
            </label>
          </div>

          <div className={styles.noteBox}>
            ℹ️ <strong>Lưu ý:</strong> Khi tạo hoặc ghi đè chuyến, số ghế trống
            sẽ được lấy lại theo sức chứa xe/sơ đồ ghế, không lấy số ghế còn
            trống của ngày mẫu.
          </div>

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
                  <span className={styles.spinner}></span> Đang sao chép dữ
                  liệu...
                </span>
              ) : (
                "Xác nhận sao chép"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
