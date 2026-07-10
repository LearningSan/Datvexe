"use client";

import { useState } from "react";

import type {
  AdminTripOptionsResponse,
  BulkUpdateTripPricePayload,
} from "@/types/admin/trips/trip-management.type";

import styles from "./BulkTripPriceModal.module.css";

interface Props {
  open: boolean;
  options?: AdminTripOptionsResponse;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: BulkUpdateTripPricePayload) => void;
}

export default function BulkTripPriceModal({
  open,
  options,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [routeId, setRouteId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [priceMode, setPriceMode] =
    useState<BulkUpdateTripPricePayload["priceMode"]>("FIXED");
  const [priceValue, setPriceValue] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      routeId: routeId ? Number(routeId) : undefined,
      dateFrom,
      dateTo,
      priceMode,
      priceValue: Number(priceValue),
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Tiêu đề Modal */}
        <div className={styles.header}>
          <div>
            <h2>💰 Điều chỉnh giá vé hàng loạt</h2>
            <p>
              Cập nhật nhanh biểu giá mới cho các chuyến xe trong khoảng thời
              gian chỉ định.
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Form nhập liệu */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Lọc theo Tuyến xe */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Tuyến xe áp dụng</label>
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className={styles.selectInput}
            >
              <option value="">🌍 Tất cả các tuyến đường đang vận hành</option>
              {options?.routes.map((route) => (
                <option key={route.routeId} value={route.routeId}>
                  {route.routeName}
                </option>
              ))}
            </select>
          </div>

          {/* Grid chọn khoảng thời gian */}
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Từ ngày <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                required
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Đến ngày <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                required
                className={styles.inputField}
              />
            </div>
          </div>

          {/* Chọn Kiểu cập nhật giá */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Phương thức điều chỉnh giá{" "}
              <span className={styles.required}>*</span>
            </label>
            <select
              value={priceMode}
              onChange={(e) => {
                setPriceMode(
                  e.target.value as BulkUpdateTripPricePayload["priceMode"],
                );
                setPriceValue(""); // Reset giá trị nhập vào khi đổi chế độ để tránh nhầm lẫn
              }}
              className={styles.selectInput}
            >
              <option value="FIXED">💵 Áp dụng mức giá cố định mới</option>
              <option value="PERCENT">
                📈 Tăng/Giảm theo tỷ lệ phần trăm (%)
              </option>
            </select>
          </div>

          {/* Ô nhập Giá trị tương ứng */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              {priceMode === "FIXED"
                ? "Mức giá vé mới"
                : "Tỷ lệ phần trăm điều chỉnh"}{" "}
              <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputUnitWrapper}>
              <input
                type="number"
                min={priceMode === "FIXED" ? 1000 : -100}
                step={priceMode === "FIXED" ? 1000 : 1}
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder={
                  priceMode === "FIXED"
                    ? "Ví dụ: 220000"
                    : "Ví dụ: 10 (Nhập số âm nếu giảm)"
                }
                required
                className={styles.inputField}
              />
              <span className={styles.inputUnitBadge}>
                {priceMode === "FIXED" ? "VNĐ" : "%"}
              </span>
            </div>
          </div>

          {/* Hộp cảnh báo an toàn tài chính */}
          <div className={styles.warningBox}>
            ⚠️ <strong>Cơ chế bảo vệ:</strong> Để tránh làm sai lệch biểu giá
            trên vé đã xuất cho khách hàng, hệ thống <strong>chỉ</strong> can
            thiệp vào các chuyến xe ở trạng thái mở bán chưa phát sinh bất kỳ
            lệnh đặt vé (Booking) nào (bao gồm cả trạng thái Chờ xử lý hoặc Đã
            xác nhận).
          </div>

          {/* Nhóm nút lưu / hủy */}
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
                  <span className={styles.spinner}></span> Đang cập nhật hệ
                  thống...
                </span>
              ) : (
                "Áp dụng biểu giá mới"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
