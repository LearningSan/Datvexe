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
type CopyMode = "YESTERDAY" | "LAST_WEEK" | "LAST_MONTH" | "CUSTOM";
export default function CopyTripsModal({
  open,
  options,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [copyMode, setCopyMode] = useState<CopyMode>("CUSTOM");

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
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  if (!open) return null;

  const handleModeChange = (mode: typeof copyMode) => {
    setCopyMode(mode);

    if (mode === "YESTERDAY") setSourceDate(shiftDate(targetDateFrom, -1));
    if (mode === "LAST_WEEK") setSourceDate(shiftDate(targetDateFrom, -7));
    if (mode === "LAST_MONTH") setSourceDate(shiftDate(targetDateFrom, -30));
  };
  const handleOverwriteChange = (checked: boolean) => {
    if (!checked) {
      setOverwriteExisting(false);
      setShowOverwriteConfirm(false);
      return;
    }

    setShowOverwriteConfirm(true);
  };

  const confirmOverwrite = () => {
    setOverwriteExisting(true);
    setShowOverwriteConfirm(false);
  };

  const cancelOverwrite = () => {
    setOverwriteExisting(false);
    setShowOverwriteConfirm(false);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (showOverwriteConfirm) {
      return;
    }

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
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget || loading) {
          return;
        }

        if (showOverwriteConfirm) {
          cancelOverwrite();
          return;
        }

        onClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-trips-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 id="copy-trips-modal-title">
              📋 Sao chép lịch trình chuyến xe
            </h2>{" "}
            <p>
              Nhân bản nhanh toàn bộ cấu trúc chuyến chạy từ một ngày có sẵn
              sang ngày hoặc khoảng ngày mong muốn.
            </p>
          </div>

          <button
            type="button"
            className={styles.cancelBtn}
            disabled={loading}
            onClick={() => {
              if (showOverwriteConfirm) {
                cancelOverwrite();
                return;
              }

              onClose();
            }}
          >
            Hủy bỏ
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Cấu hình ngày nguồn</label>
            <select
              value={copyMode}
              onChange={(e) => handleModeChange(e.target.value as CopyMode)}
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
                disabled={loading || showOverwriteConfirm}
                onChange={(e) => handleOverwriteChange(e.target.checked)}
                className={styles.checkboxInput}
              />

              <span className={styles.checkboxLabel}>
                <strong>Ghi đè chuyến đã tồn tại:</strong> Cập nhật lại xe, số
                ghế trống và giá vé cho các chuyến chưa có booking.
              </span>
            </label>
            {showOverwriteConfirm && (
              <div className={styles.overwriteConfirmBox}>
                <div className={styles.overwriteConfirmHeader}>
                  <div className={styles.overwriteConfirmIcon}>!</div>

                  <div>
                    <span>Xác nhận tùy chọn</span>
                    <h3>Bật ghi đè chuyến đã tồn tại</h3>
                  </div>
                </div>

                <p className={styles.overwriteConfirmDescription}>
                  Các chuyến đã tồn tại nhưng chưa có booking sẽ được cập nhật
                  lại xe, số ghế trống và giá vé theo dữ liệu sao chép.
                </p>

                <div className={styles.overwriteConfirmWarning}>
                  Các chuyến đã có hành khách đặt vé sẽ được bỏ qua để tránh làm
                  sai dữ liệu booking.
                </div>

                <div className={styles.overwriteConfirmInfo}>
                  <div>
                    <span>Ngày mẫu</span>
                    <strong>{sourceDate}</strong>
                  </div>

                  <div>
                    <span>Ngày áp dụng</span>
                    <strong>
                      {copyTargetMode === "SINGLE"
                        ? targetDateFrom
                        : `${targetDateFrom} đến ${targetDateTo}`}
                    </strong>
                  </div>

                  <div>
                    <span>Phạm vi tuyến</span>
                    <strong>
                      {routeId
                        ? (options?.routes.find(
                            (route) => route.routeId === Number(routeId),
                          )?.routeName ?? "Tuyến đã chọn")
                        : "Tất cả tuyến"}
                    </strong>
                  </div>
                </div>

                <div className={styles.overwriteConfirmActions}>
                  <button
                    type="button"
                    className={styles.overwriteConfirmCancel}
                    disabled={loading}
                    onClick={cancelOverwrite}
                  >
                    Không bật
                  </button>

                  <button
                    type="button"
                    className={styles.overwriteConfirmSubmit}
                    disabled={loading}
                    onClick={confirmOverwrite}
                  >
                    Xác nhận bật ghi đè
                  </button>
                </div>
              </div>
            )}
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
              disabled={loading || showOverwriteConfirm}
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || showOverwriteConfirm}
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
