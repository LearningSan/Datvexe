"use client";

import { useEffect, useState } from "react";

import type {
  AdminPickupPointItem,
  PickupPointCategory,
} from "@/types/admin/pickup-points/pickup-point-management.type";

import styles from "./PickupPointDetailModal.module.css";

interface Props {
  open: boolean;
  point: AdminPickupPointItem | null;
  initialTab?: "INFO" | "MAP";
  onClose: () => void;
}

const CATEGORY_MAP: Record<PickupPointCategory, string> = {
  MAIN_HUB: "Bến chính",
  OFFICE: "Văn phòng",
  SHUTTLE_AREA: "Trung chuyển",
  REST_STOP: "Trạm nghỉ",
};

function formatDateTime(value: string | null) {
  if (!value) return "Chưa có";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function getUsageRoleLabel(point: AdminPickupPointItem) {
  if (point.pointCategory === "SHUTTLE_AREA") {
    return "Trung chuyển";
  }

  const hasPickup = point.pickupTripCount > 0 || point.pickupBookingCount > 0;
  const hasDropoff =
    point.dropoffTripCount > 0 || point.dropoffBookingCount > 0;

  if (hasPickup && hasDropoff) return "Đón & trả";
  if (hasPickup) return "Điểm đón";
  if (hasDropoff) return "Điểm trả";

  return "Chưa sử dụng";
}

function getWarningLabel(point: AdminPickupPointItem) {
  if (!point.isActive) return "Đang tạm ngưng";
  if (!point.latitude || !point.longitude) return "Thiếu tọa độ";
  if (point.linkedTripCount === 0) return "Chưa gắn chuyến/tuyến";

  return "Đạt chuẩn";
}

export default function PickupPointDetailModal({
  open,
  point,
  initialTab = "INFO",
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<"INFO" | "MAP">(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  if (!open || !point) return null;

  const hasCoordinate = !!point.latitude && !!point.longitude;

  return (
    <div className={styles.overlay}>
      <div className={styles.detailModal}>
        {/* --- Header cố định --- */}
        <div className={styles.modalHeader}>
          <div>
            <h2>Chi tiết điểm đón trả</h2>
            <p>{point.pointName}</p>
          </div>

          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* --- Tabs điều hướng cố định --- */}
        <div className={styles.detailTabs}>
          <button
            type="button"
            className={activeTab === "INFO" ? styles.tabActive : ""}
            onClick={() => setActiveTab("INFO")}
          >
            Thông tin điểm
          </button>

          <button
            type="button"
            className={activeTab === "MAP" ? styles.tabActive : ""}
            onClick={() => setActiveTab("MAP")}
          >
            Bản đồ
          </button>
        </div>

        {/* --- Thân Modal chứa vùng cuộn độc lập --- */}
        {activeTab === "INFO" ? (
          <div className={styles.modalBody}>
            <div className={styles.detailSection}>
              <h3>Thông tin cơ bản</h3>

              <div className={styles.detailGrid}>
                <div>
                  <span>Mã điểm</span>
                  <strong>#{point.pickupPointId}</strong>
                </div>

                <div>
                  <span>Tên điểm</span>
                  <strong>{point.pointName}</strong>
                </div>

                <div>
                  <span>Địa chỉ</span>
                  <strong>{point.address ?? "Chưa có địa chỉ"}</strong>
                </div>

                <div>
                  <span>Thành phố</span>
                  <strong>{point.cityName}</strong>
                </div>

                <div>
                  <span>Khu vực</span>
                  <strong>{point.zoneName}</strong>
                </div>

                <div>
                  <span>Loại địa điểm</span>
                  <strong>
                    {CATEGORY_MAP[point.pointCategory] ?? point.pointCategory}
                  </strong>
                </div>

                <div>
                  <span>Vai trò sử dụng</span>
                  <strong>{getUsageRoleLabel(point)}</strong>
                </div>

                <div>
                  <span>Trạng thái</span>
                  <strong
                    className={
                      point.isActive ? styles.textSuccess : styles.textDanger
                    }
                  >
                    {point.isActive ? "● Hoạt động" : "● Tạm ngưng"}
                  </strong>
                </div>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h3>Cấu hình vận hành</h3>

              <div className={styles.detailGrid}>
                <div>
                  <span>Cảnh báo vận hành</span>
                  <strong>{getWarningLabel(point)}</strong>
                </div>

                <div>
                  <span>Chuyến liên kết</span>
                  <strong>{point.linkedTripCount}</strong>
                </div>

                <div>
                  <span>Tuyến/chuyến dùng làm điểm đón</span>
                  <strong>{point.pickupTripCount}</strong>
                </div>

                <div>
                  <span>Tuyến/chuyến dùng làm điểm trả</span>
                  <strong>{point.dropoffTripCount}</strong>
                </div>

                <div>
                  <span>Tổng lượt booking</span>
                  <strong>{point.bookingCount}</strong>
                </div>

                <div>
                  <span>Booking chọn làm điểm đón</span>
                  <strong>{point.pickupBookingCount}</strong>
                </div>

                <div>
                  <span>Booking chọn làm điểm trả</span>
                  <strong>{point.dropoffBookingCount}</strong>
                </div>

                <div>
                  <span>Lần dùng gần nhất</span>
                  <strong>{formatDateTime(point.lastUsedAt)}</strong>
                </div>
              </div>
            </div>

            <div className={styles.detailSection}>
              <h3>Tọa độ & bản đồ</h3>

              <div className={styles.detailGrid}>
                <div>
                  <span>Vĩ độ</span>
                  <strong>{point.latitude ?? "Chưa có"}</strong>
                </div>

                <div>
                  <span>Kinh độ</span>
                  <strong>{point.longitude ?? "Chưa có"}</strong>
                </div>

                <div>
                  <span>Trạng thái tọa độ</span>
                  <strong>
                    {hasCoordinate ? "Đã có tọa độ" : "Thiếu tọa độ"}
                  </strong>
                </div>

                <div>
                  <span>Ngày tạo</span>
                  <strong>{formatDateTime(point.createdAt)}</strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.modalBody}>
            <div className={styles.detailSection}>
              <h3>Bản đồ vị trí</h3>

              {hasCoordinate ? (
                <iframe
                  className={styles.mapFrame}
                  src={`https://maps.google.com/maps?q=${point.latitude},${point.longitude}&z=16&output=embed`}
                  loading="lazy"
                />
              ) : (
                <div className={styles.emptyState}>
                  Điểm này chưa có tọa độ để hiển thị bản đồ.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
