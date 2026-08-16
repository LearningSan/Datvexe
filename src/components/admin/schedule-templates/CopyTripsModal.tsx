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

type TargetMode = "SINGLE" | "RANGE";

function formatDate(date: string) {
  if (!date) return "";

  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

function shiftDate(baseDate: string, days: number) {
  if (!baseDate) return "";

  const [year, month, day] = baseDate.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() + days);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getPreviousMonthSameDay(dateString: string) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);

  const targetMonth = month - 1;

  if (targetMonth <= 0) {
    return `${year - 1}-12-${String(day).padStart(2, "0")}`;
  }

  const maxDay = new Date(year, targetMonth, 0).getDate();

  return [
    year,
    String(targetMonth).padStart(2, "0"),
    String(Math.min(day, maxDay)).padStart(2, "0"),
  ].join("-");
}

export default function CopyTripsModal({
  open,
  options,
  loading = false,
  onClose,
  onSubmit,
}: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /*
   * ============================================================
   * DATE
   * ============================================================
   */

  const [sourceDate, setSourceDate] = useState(shiftDate(today, -1));

  const [targetMode, setTargetMode] = useState<TargetMode>("SINGLE");

  const [targetDateFrom, setTargetDateFrom] = useState(today);

  const [targetDateTo, setTargetDateTo] = useState(today);

  /*
   * ============================================================
   * ROUTE
   * ============================================================
   */

  const [routeId, setRouteId] = useState("");

  /*
   * ============================================================
   * DATA TO KEEP
   * ============================================================
   */

  const [keepVehicle, setKeepVehicle] = useState(true);

  const [keepDriver, setKeepDriver] = useState(true);

  const [keepPrice, setKeepPrice] = useState(true);

  /*
   * ============================================================
   * EXISTING TRIPS
   * ============================================================
   */

  const [overwriteExisting, setOverwriteExisting] = useState(false);

  if (!open) return null;

  /*
   * ============================================================
   * DERIVED DATA
   * ============================================================
   */

  const selectedRouteName = routeId
    ? options?.routes.find((route) => route.routeId === Number(routeId))
        ?.routeName
    : null;

  /*
   * ============================================================
   * QUICK SOURCE DATE
   * ============================================================
   */

  const setSourceFromTarget = (
    type: "YESTERDAY" | "LAST_WEEK" | "LAST_MONTH",
  ) => {
    if (!targetDateFrom) return;

    let date = targetDateFrom;

    if (type === "YESTERDAY") {
      date = shiftDate(targetDateFrom, -1);
    }

    if (type === "LAST_WEEK") {
      date = shiftDate(targetDateFrom, -7);
    }

    if (type === "LAST_MONTH") {
      date = getPreviousMonthSameDay(targetDateFrom);
    }

    setSourceDate(date);
  };

  /*
   * ============================================================
   * TARGET DATE
   * ============================================================
   */

  const handleTargetFromChange = (value: string) => {
    setTargetDateFrom(value);

    if (targetMode === "SINGLE") {
      setTargetDateTo(value);
      return;
    }

    if (!targetDateTo || targetDateTo < value) {
      setTargetDateTo(value);
    }
  };

  /*
   * ============================================================
   * SUBMIT
   * ============================================================
   */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();


    const finalTargetDateTo =
      targetMode === "SINGLE" ? targetDateFrom : targetDateTo;

    onSubmit({
      sourceDate,
      targetDateFrom,
      targetDateTo: finalTargetDateTo,
      routeId: routeId ? Number(routeId) : undefined,

      keepVehicle,
      keepDriver,
      keepPrice,

      overwriteExisting,
    });
  };

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (loading) return;

        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-trips-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className={styles.header}>
          <div>
            <h2 id="copy-trips-modal-title">📋 Sao chép chuyến xe</h2>

            <p>
              Sao chép các chuyến từ một ngày mẫu sang ngày khác hoặc một khoảng
              ngày.
            </p>
          </div>

          <button
            type="button"
            className={styles.cancelBtn}
            disabled={loading}
            onClick={onClose}
          >
            Hủy
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* ====================================================
              1. NGÀY MẪU
          ==================================================== */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.stepNumber}>1</div>

              <div>
                <h3>Ngày mẫu</h3>

                <p>Chọn ngày đang có các chuyến muốn sao chép.</p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Ngày mẫu
                <span className={styles.required}> *</span>
              </label>

              <input
                type="date"
                value={sourceDate}
                onChange={(e) => setSourceDate(e.target.value)}
                required
                className={styles.inputField}
              />
            </div>

            <div className={styles.quickDateGroup}>
              <span className={styles.quickDateLabel}>Chọn nhanh:</span>

              <button
                type="button"
                className={styles.quickDateBtn}
                onClick={() => setSourceFromTarget("YESTERDAY")}
              >
                Hôm trước
              </button>

              <button
                type="button"
                className={styles.quickDateBtn}
                onClick={() => setSourceFromTarget("LAST_WEEK")}
              >
                Tuần trước
              </button>

              <button
                type="button"
                className={styles.quickDateBtn}
                onClick={() => setSourceFromTarget("LAST_MONTH")}
              >
                Tháng trước
              </button>
            </div>
          </section>

          {/* ====================================================
              2. NGÀY ĐÍCH
          ==================================================== */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.stepNumber}>2</div>

              <div>
                <h3>Ngày cần tạo chuyến</h3>

                <p>Chọn ngày hoặc khoảng ngày nhận dữ liệu sao chép.</p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Phạm vi ngày</label>

              <div className={styles.segmentedControl}>
                <button
                  type="button"
                  className={
                    targetMode === "SINGLE"
                      ? styles.segmentActive
                      : styles.segment
                  }
                  onClick={() => {
                    setTargetMode("SINGLE");
                    setTargetDateTo(targetDateFrom);
                  }}
                >
                  Một ngày
                </button>

                <button
                  type="button"
                  className={
                    targetMode === "RANGE"
                      ? styles.segmentActive
                      : styles.segment
                  }
                  onClick={() => setTargetMode("RANGE")}
                >
                  Khoảng ngày
                </button>
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {targetMode === "SINGLE" ? "Ngày cần tạo" : "Từ ngày"}

                  <span className={styles.required}> *</span>
                </label>

                <input
                  type="date"
                  value={targetDateFrom}
                  onChange={(e) => handleTargetFromChange(e.target.value)}
                  required
                  className={styles.inputField}
                />
              </div>

              {targetMode === "RANGE" && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Đến ngày
                    <span className={styles.required}> *</span>
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

            <div className={styles.previewBox}>
              <span>Đang thực hiện:</span>

              <strong>{formatDate(sourceDate)}</strong>

              <span className={styles.arrow}>→</span>

              <strong>
                {targetMode === "SINGLE"
                  ? formatDate(targetDateFrom)
                  : `${formatDate(
                      targetDateFrom,
                    )} → ${formatDate(targetDateTo)}`}
              </strong>
            </div>
          </section>

          {/* ====================================================
              3. TUYẾN
          ==================================================== */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.stepNumber}>3</div>

              <div>
                <h3>Phạm vi tuyến</h3>

                <p>Chọn tuyến muốn sao chép hoặc áp dụng cho tất cả tuyến.</p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Tuyến đường</label>

              <select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                className={styles.selectInput}
              >
                <option value="">🌍 Tất cả tuyến</option>

                {options?.routes.map((route) => (
                  <option key={route.routeId} value={route.routeId}>
                    {route.routeName}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* ====================================================
              4. DỮ LIỆU KẾ THỪA
          ==================================================== */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.stepNumber}>4</div>

              <div>
                <h3>Dữ liệu kế thừa</h3>

                <p>Chọn những thông tin sẽ lấy từ chuyến ngày mẫu.</p>
              </div>
            </div>

            <div className={styles.optionList}>
              {/* VEHICLE */}

              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={keepVehicle}
                  onChange={(e) => setKeepVehicle(e.target.checked)}
                  className={styles.checkboxInput}
                />

                <div>
                  <strong>🚍 Xe</strong>

                  <p>Giữ nguyên xe đang được phân công từ ngày mẫu.</p>
                </div>
              </label>

              {/* DRIVER */}

              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={keepDriver}
                  onChange={(e) => setKeepDriver(e.target.checked)}
                  className={styles.checkboxInput}
                />

                <div>
                  <strong>👨‍✈️ Tài xế</strong>

                  <p>Giữ nguyên tài xế đang được phân công từ ngày mẫu.</p>
                </div>
              </label>

              {/* PRICE */}

              <label className={styles.optionCard}>
                <input
                  type="checkbox"
                  checked={keepPrice}
                  onChange={(e) => setKeepPrice(e.target.checked)}
                  className={styles.checkboxInput}
                />

                <div>
                  <strong>💰 Giá vé</strong>

                  <p>Giữ nguyên giá vé của chuyến ngày mẫu.</p>
                </div>
              </label>
            </div>

            <div className={styles.noteBox}>
              ℹ️ Khi giữ nguyên xe hoặc tài xế, hệ thống vẫn kiểm tra lịch phân
              công, thời gian nghỉ và vị trí của tài nguyên trước khi tạo
              chuyến.
            </div>
          </section>

          {/* ====================================================
              5. CHUYẾN ĐÃ TỒN TẠI
          ==================================================== */}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.stepNumber}>5</div>

              <div>
                <h3>Chuyến đã tồn tại</h3>

                <p>
                  Quyết định cách xử lý nếu ngày đích đã có chuyến trùng lịch.
                </p>
              </div>
            </div>

            <label
              className={`${styles.optionCard} ${
                overwriteExisting ? styles.optionCardWarning : ""
              }`}
            >
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                disabled={loading}
                className={styles.checkboxInput}
              />

              <div>
                <strong>⚠️ Ghi đè chuyến chưa có booking</strong>

                <p>
                  Cập nhật lại dữ liệu theo chuyến mẫu đối với chuyến đã tồn tại
                  nhưng chưa có hành khách đặt vé.
                </p>
              </div>
            </label>

            {!overwriteExisting && (
              <div className={styles.safeInfo}>
                🛡️ Chế độ an toàn: chuyến đã tồn tại sẽ được giữ nguyên và bỏ
                qua.
              </div>
            )}

            {overwriteExisting && (
              <div className={styles.warningBox}>
                <strong>⚠️ Bạn đang bật chế độ ghi đè</strong>

                <p>
                  Chỉ những chuyến chưa có booking mới được cập nhật. Chuyến đã
                  có hành khách sẽ được giữ nguyên để tránh ảnh hưởng dữ liệu
                  vé.
                </p>
              </div>
            )}
          </section>

          {/* ====================================================
              6. SUMMARY
          ==================================================== */}

          <section className={styles.summarySection}>
            <h3>📋 Tóm tắt thao tác</h3>

            <div className={styles.summaryGrid}>
              <div>
                <span>Ngày mẫu</span>

                <strong>{formatDate(sourceDate)}</strong>
              </div>

              <div>
                <span>Ngày tạo</span>

                <strong>
                  {targetMode === "SINGLE"
                    ? formatDate(targetDateFrom)
                    : `${formatDate(
                        targetDateFrom,
                      )} → ${formatDate(targetDateTo)}`}
                </strong>
              </div>

              <div>
                <span>Tuyến</span>

                <strong>{selectedRouteName || "Tất cả tuyến"}</strong>
              </div>

              <div>
                <span>Kế thừa</span>

                <strong>
                  {[
                    keepVehicle && "Xe",
                    keepDriver && "Tài xế",
                    keepPrice && "Giá",
                  ]
                    .filter(Boolean)
                    .join(" • ") || "Không kế thừa"}
                </strong>
              </div>
            </div>
          </section>

          {/* ====================================================
              ACTION
          ==================================================== */}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.loadingFlex}>
                  <span className={styles.spinner} />
                  Đang sao chép...
                </span>
              ) : (
                "📋 Xác nhận sao chép"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
