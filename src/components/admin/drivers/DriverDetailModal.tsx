"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useDriverDetail, useResetDriverPassword } from "@/hooks/admin/useDrivers";
import { formatDateTimeVN } from "@/lib/client/helpers";
import type { AdminDriverItem } from "@/types/admin/drivers/driver-management.type";

import styles from "./DriverDetailModal.module.css";

interface Props {
  open: boolean;
  driver: AdminDriverItem | null;
  onClose: () => void;
}

export default function DriverDetailModal({ open, driver, onClose }: Props) {
  const { data, isLoading, isError } = useDriverDetail(driver?.driverId);
  const resetPasswordMutation = useResetDriverPassword();

  const [newPassword, setNewPassword] = useState("");
  const [showResetBox, setShowResetBox] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewPassword("");
      setShowResetBox(false);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (open) window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !driver) return null;

  const loginMethods = data?.loginMethods?.length ? data.loginMethods : ["LOCAL"];

  const driverTypeLabel = (type?: string) => {
    if (type === "BUS") return "Xe khách";
    if (type === "SHUTTLE") return "Trung chuyển";
    if (type === "BOTH") return "Xe khách & Trung chuyển";
    return "Không rõ";
  };

  const statusLabel = (status?: string) => {
    if (status === "AVAILABLE") return "🟢 Sẵn sàng";
    if (status === "ASSIGNED") return "🔵 Đang được phân công";
    if (status === "OFF") return "⚪ Tạm nghỉ";
    return "Không rõ";
  };

  const tripStatusLabel = (status?: string) => {
    if (status === "OPEN") return "Mở bán";
    if (status === "FULL") return "Đã đầy";
    if (status === "RUNNING") return "Đang chạy";
    if (status === "COMPLETED") return "Hoàn thành";
    if (status === "CANCELLED") return "Đã hủy";
    return status || "Không rõ";
  };

  const handleResetPassword = () => {
    if (!driver.driverId) return;

    const password = newPassword.trim();

    if (password.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (!window.confirm("Bạn có chắc muốn reset mật khẩu tài xế này?")) {
      return;
    }

    resetPasswordMutation.mutate(
      {
        driverId: driver.driverId,
        newPassword: password,
      },
      {
        onSuccess: () => {
          toast.success("Reset mật khẩu tài xế thành công");
          setNewPassword("");
          setShowResetBox(false);
        },
        onError: (error: any) => {
          toast.error(error?.message || "Reset mật khẩu thất bại");
        },
      },
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>Chi tiết tài xế</h2>
            <span>Tài xế #{driver.driverId}</span>
          </div>

          <button type="button" onClick={onClose} className={styles.closeBtn}>
            &times;
          </button>
        </div>

        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loadingState}>Đang tải chi tiết tài xế...</div>
          ) : isError ? (
            <div className={styles.emptyState}>Không thể tải chi tiết tài xế.</div>
          ) : (
            <>
              <div className={styles.summaryGrid}>
                <div>
                  <span>Tổng phân công</span>
                  <strong>{data?.assignedTripCount ?? 0}</strong>
                </div>

                <div>
                  <span>Chuyến sắp tới</span>
                  <strong>{data?.upcomingTripCount ?? 0}</strong>
                </div>

                <div>
                  <span>Đã hoàn thành</span>
                  <strong>{data?.completedTripCount ?? 0}</strong>
                </div>

                <div>
                  <span>Đăng nhập</span>
                  <strong>{loginMethods.join(" / ")}</strong>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <label>Họ tên</label>
                  <strong>{data?.fullName ?? driver.fullName}</strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Email</label>
                  <strong>{data?.email ?? driver.email ?? "Chưa có"}</strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Số điện thoại</label>
                  <strong>{data?.phone ?? driver.phone ?? "Chưa có"}</strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Loại tài xế</label>
                  <strong>{driverTypeLabel(data?.driverType ?? driver.driverType)}</strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Số GPLX</label>
                  <strong>{data?.licenseNumber ?? driver.licenseNumber}</strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Trạng thái</label>
                  <strong>{statusLabel(data?.status ?? driver.status)}</strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Ngày vào làm</label>
                  <strong>{formatDateTimeVN(data?.hiredDate) || "Chưa có"}</strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Ngày tạo hồ sơ</label>
                  <strong>{formatDateTimeVN(data?.createdAt) || "---"}</strong>
                </div>
              </div>

              <div className={styles.resetSection}>
                <button
                  type="button"
                  className={styles.resetToggleBtn}
                  onClick={() => setShowResetBox((prev) => !prev)}
                >
                  Reset mật khẩu
                </button>

                {showResetBox && (
                  <div className={styles.resetBox}>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới tối thiểu 6 ký tự"
                    />

                    <button
                      type="button"
                      disabled={resetPasswordMutation.isPending}
                      onClick={handleResetPassword}
                    >
                      {resetPasswordMutation.isPending
                        ? "Đang reset..."
                        : "Xác nhận reset"}
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.historySection}>
                <h3>Lịch sử phân công chuyến</h3>

                {(data?.assignments ?? []).length === 0 ? (
                  <div className={styles.emptyState}>
                    Tài xế chưa có lịch sử phân công chuyến.
                  </div>
                ) : (
                  <div className={styles.assignmentList}>
                    {(data?.assignments ?? []).map((item: any) => (
                      <div key={`${item.tripId}-${item.assignedRole}`} className={styles.assignmentItem}>
                        <div>
                          <strong>{item.routeName}</strong>
                          <span>Vai trò: {item.assignedRole}</span>
                          <span>Khởi hành: {formatDateTimeVN(item.departureDatetime)}</span>
                        </div>

                        <div>
                          <span>{tripStatusLabel(item.tripStatus)}</span>
                          <span>
                            Xe: {item.vehicleName ?? "Chưa gán"} -{" "}
                            {item.licensePlate ?? "N/A"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}