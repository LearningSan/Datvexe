"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  useDriverDetail,
  useResetDriverPassword,
} from "@/hooks/admin/useDrivers";
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
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewPassword("");
      setShowResetBox(false);
      setShowResetConfirm(false);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || resetPasswordMutation.isPending) {
        return;
      }

      if (showResetConfirm) {
        setShowResetConfirm(false);
        return;
      }

      onClose();
    };

    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, showResetConfirm, resetPasswordMutation.isPending]);

  if (!open || !driver) return null;

  const loginMethods = data?.loginMethods?.length
    ? data.loginMethods
    : ["LOCAL"];

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

    setShowResetConfirm(true);
  };

  const handleSubmitResetPassword = () => {
    if (!driver.driverId || resetPasswordMutation.isPending) return;

    const password = newPassword.trim();

    if (password.length < 6) {
      setShowResetConfirm(false);
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
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
          setShowResetConfirm(false);
        },
        onError: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Reset mật khẩu thất bại";

          toast.error(message);
        },
      },
    );
  };

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !resetPasswordMutation.isPending) {
          if (showResetConfirm) {
            setShowResetConfirm(false);
            return;
          }

          onClose();
        }
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-detail-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 id="driver-detail-title">Chi tiết tài xế</h2>{" "}
            <span>Tài xế #{driver.driverId}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showResetConfirm) {
                setShowResetConfirm(false);
                return;
              }

              onClose();
            }}
            className={styles.closeBtn}
            disabled={resetPasswordMutation.isPending}
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>
        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loadingState}>
              Đang tải chi tiết tài xế...
            </div>
          ) : isError ? (
            <div className={styles.emptyState}>
              Không thể tải chi tiết tài xế.
            </div>
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
                  <strong>
                    {driverTypeLabel(data?.driverType ?? driver.driverType)}
                  </strong>
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
                  <strong>
                    {formatDateTimeVN(data?.hiredDate) || "Chưa có"}
                  </strong>
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
                  disabled={resetPasswordMutation.isPending}
                  onClick={() => {
                    if (showResetBox) {
                      setNewPassword("");
                    }

                    setShowResetBox((prev) => !prev);
                    setShowResetConfirm(false);
                  }}
                >
                  Reset mật khẩu
                </button>

                {showResetBox && !showResetConfirm && (
                  <div className={styles.resetBox}>
                    <input
                      type="password"
                      value={newPassword}
                      disabled={resetPasswordMutation.isPending}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleResetPassword();
                        }
                      }}
                      placeholder="Nhập mật khẩu mới tối thiểu 6 ký tự"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      disabled={resetPasswordMutation.isPending}
                      onClick={handleResetPassword}
                    >
                      Xác nhận reset
                    </button>
                  </div>
                )}

                {showResetConfirm && (
                  <div className={styles.resetConfirmBox}>
                    <div className={styles.resetConfirmHeader}>
                      <div className={styles.resetConfirmIcon}>!</div>

                      <div>
                        <span>Xác nhận thao tác</span>
                        <h3>Reset mật khẩu tài xế</h3>
                      </div>
                    </div>

                    <p className={styles.resetConfirmDescription}>
                      Mật khẩu đăng nhập của tài xế sẽ được thay đổi ngay sau
                      khi xác nhận. Tài xế phải sử dụng mật khẩu mới trong lần
                      đăng nhập tiếp theo.
                    </p>

                    <div className={styles.resetConfirmDriver}>
                      <div>
                        <span>Tài xế</span>
                        <strong>{data?.fullName ?? driver.fullName}</strong>
                      </div>

                      <div>
                        <span>Số điện thoại</span>
                        <strong>
                          {data?.phone ?? driver.phone ?? "Chưa có"}
                        </strong>
                      </div>

                      <div>
                        <span>Mật khẩu mới</span>
                        <strong>
                          {"•".repeat(Math.min(newPassword.trim().length, 12))}
                        </strong>
                      </div>
                    </div>

                    <div className={styles.resetConfirmWarning}>
                      Sau khi reset, mật khẩu cũ sẽ không còn sử dụng được.
                    </div>

                    <div className={styles.resetConfirmActions}>
                      <button
                        type="button"
                        className={styles.resetConfirmCancel}
                        disabled={resetPasswordMutation.isPending}
                        onClick={() => setShowResetConfirm(false)}
                      >
                        Quay lại
                      </button>

                      <button
                        type="button"
                        className={styles.resetConfirmSubmit}
                        disabled={resetPasswordMutation.isPending}
                        onClick={handleSubmitResetPassword}
                      >
                        {resetPasswordMutation.isPending
                          ? "Đang reset..."
                          : "Xác nhận reset"}
                      </button>
                    </div>
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
                      <div
                        key={`${item.tripId}-${item.assignedRole}`}
                        className={styles.assignmentItem}
                      >
                        <div>
                          <strong>{item.routeName}</strong>
                          <span>Vai trò: {item.assignedRole}</span>
                          <span>
                            Khởi hành:{" "}
                            {formatDateTimeVN(item.departureDatetime)}
                          </span>
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
