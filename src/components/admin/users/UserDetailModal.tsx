"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useResetUserPassword, useUserDetail } from "@/hooks/admin/useUsers";
import { formatDateTimeVN } from "@/lib/client/helpers";
import type { AdminUserItem } from "@/types/admin/users/user-management.type";

import styles from "./UserDetailModal.module.css";

interface Props {
  open: boolean;
  user: AdminUserItem | null;
  onClose: () => void;
}

export default function UserDetailModal({ open, user, onClose }: Props) {
  const { data, isLoading, isError } = useUserDetail(user);
  const resetPasswordMutation = useResetUserPassword();

  const [newPassword, setNewPassword] = useState("");
  const [showResetBox, setShowResetBox] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const isGuest = user?.customerType === "GUEST";

  const loginMethods = useMemo(() => {
    if (isGuest) return [];
    const methods = data?.loginMethods ?? [];
    return methods.length > 0 ? methods : ["LOCAL"];
  }, [data?.loginMethods, isGuest]);

  const displayName = data?.fullName || user?.fullName || "Khách hàng";
  const displayEmail = data?.email || user?.email || null;
  const displayPhone = data?.phone || user?.phone || null;
  const displayAvatar = data?.avatarUrl || user?.avatarUrl || null;

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

  useEffect(() => {
    if (!open) {
      setNewPassword("");
      setShowResetBox(false);
      setShowResetConfirm(false);
    }
  }, [open]);

  if (!open || !user) return null;

  const getStatusClass = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "PAID":
      case "SUCCESS":
      case "COMPLETED":
      case "CONFIRMED":
        return styles.statusPaid;
      case "PENDING":
      case "PROCESSING":
        return styles.statusPending;
      case "CANCELLED":
      case "REFUNDED":
        return styles.statusCancelled;
      default:
        return styles.statusDefault;
    }
  };

  const bookingStatusLabel = (status?: string) => {
    switch (status) {
      case "PENDING":
        return "Chờ thanh toán";
      case "CONFIRMED":
        return "Đã xác nhận";
      case "CANCELLED":
        return "Đã hủy";
      case "COMPLETED":
        return "Hoàn thành";
      case "REFUNDED":
        return "Đã hoàn tiền";
      default:
        return status || "Không rõ";
    }
  };

  const handleResetPassword = () => {
    if (!user.userId) {
      toast.error("Không thể reset mật khẩu cho khách vãng lai");
      return;
    }

    const password = newPassword.trim();

    if (password.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setShowResetConfirm(true);
  };
  const handleSubmitResetPassword = () => {
    if (!user.userId || resetPasswordMutation.isPending) return;

    const password = newPassword.trim();

    if (password.length < 6) {
      setShowResetConfirm(false);
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    resetPasswordMutation.mutate(
      {
        userId: user.userId,
        newPassword: password,
      },
      {
        onSuccess: () => {
          toast.success("Reset mật khẩu thành công");
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
        if (e.target !== e.currentTarget || resetPasswordMutation.isPending) {
          return;
        }

        if (showResetConfirm) {
          setShowResetConfirm(false);
          return;
        }

        onClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-detail-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 id="user-detail-title">Chi tiết khách hàng</h2>{" "}
            <span className={styles.subTitle}>
              {isGuest
                ? "Phân hệ Khách vãng lai"
                : `Tài khoản thành viên (#${user.userId})`}
            </span>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            disabled={resetPasswordMutation.isPending}
            aria-label="Đóng"
            onClick={() => {
              if (showResetConfirm) {
                setShowResetConfirm(false);
                return;
              }

              onClose();
            }}
          >
            &times;
          </button>
        </div>

        <div className={styles.body}>
          {!isGuest && (
            <div className={styles.resetSection}>
              <button
                type="button"
                className={styles.resetToggleBtn}
                disabled={resetPasswordMutation.isPending}
                onClick={() => {
                  setShowResetBox((prev) => {
                    const next = !prev;

                    if (!next) {
                      setNewPassword("");
                    }

                    return next;
                  });

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
                    className={styles.resetInput}
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className={styles.resetConfirmBtn}
                    disabled={resetPasswordMutation.isPending}
                    onClick={handleResetPassword}
                  >
                    Tiếp tục
                  </button>
                </div>
              )}

              {showResetConfirm && (
                <div className={styles.resetConfirmBox}>
                  <div className={styles.resetConfirmHeader}>
                    <div className={styles.resetConfirmIcon}>!</div>

                    <div>
                      <span>Xác nhận thao tác</span>
                      <h3>Reset mật khẩu khách hàng</h3>
                    </div>
                  </div>

                  <p className={styles.resetConfirmDescription}>
                    Mật khẩu đăng nhập của khách hàng sẽ được thay đổi ngay sau
                    khi xác nhận.
                  </p>

                  <div className={styles.resetConfirmUser}>
                    <div>
                      <span>Khách hàng</span>
                      <strong>{displayName}</strong>
                    </div>

                    <div>
                      <span>Email</span>
                      <strong>{displayEmail ?? "Chưa có"}</strong>
                    </div>

                    <div>
                      <span>Số điện thoại</span>
                      <strong>{displayPhone ?? "Chưa có"}</strong>
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
          )}

          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Đang tải dữ liệu chi tiết...</p>
            </div>
          ) : isError ? (
            <div className={styles.emptyHistory}>
              <p>Không thể tải chi tiết khách hàng. Vui lòng thử lại.</p>
            </div>
          ) : (
            <>
              <div className={styles.summaryBar}>
                <div>
                  <span>Booking</span>
                  <strong>
                    {data?.bookingCount ?? user.bookingCount ?? 0}
                  </strong>
                </div>

                <div>
                  <span>Tổng chi tiêu</span>
                  <strong>
                    {Number(data?.totalSpent ?? 0).toLocaleString("vi-VN")}đ
                  </strong>
                </div>

                <div>
                  <span>Đăng nhập</span>
                  <strong>
                    {isGuest ? "Không có tài khoản" : loginMethods.join(" / ")}
                  </strong>
                </div>
              </div>

              <div className={styles.avatarSection}>
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoCard}>
                  <label>Họ và tên</label>
                  <strong>{displayName}</strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Địa chỉ Email</label>
                  <strong className={!displayEmail ? styles.textMuted : ""}>
                    {displayEmail || "Chưa thiết lập"}
                  </strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Số điện thoại</label>
                  <strong className={!displayPhone ? styles.textMuted : ""}>
                    {displayPhone || "Không có dữ liệu"}
                  </strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Trạng thái tài khoản</label>
                  <span
                    className={`${styles.statusText} ${
                      user.status === "ACTIVE"
                        ? styles.textActive
                        : styles.textBlocked
                    }`}
                  >
                    {user.status === "ACTIVE"
                      ? "🟢 Đang hoạt động"
                      : "🔴 Đang bị khóa"}
                  </span>
                </div>

                <div className={styles.infoCard}>
                  <label>Hình thức đăng nhập</label>
                  <strong>
                    {isGuest ? "Không có tài khoản" : loginMethods.join(" / ")}
                  </strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Xác thực Email</label>
                  <strong>
                    {isGuest
                      ? "Không áp dụng"
                      : data?.emailVerifiedAt
                        ? "✅ Đã xác thực"
                        : "⚠️ Chưa xác thực"}
                  </strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Tích lũy Booking</label>
                  <strong className={styles.highlightCount}>
                    {data?.bookingCount ?? user.bookingCount ?? 0}
                  </strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Tổng chi tiêu</label>
                  <strong className={styles.priceAmount}>
                    {Number(data?.totalSpent ?? 0).toLocaleString("vi-VN")}đ
                  </strong>
                </div>

                <div className={styles.infoCard}>
                  <label>Ngày gia nhập hệ thống</label>
                  <span className={styles.dateText}>
                    {formatDateTimeVN(data?.createdAt) || "Vãng lai"}
                  </span>
                </div>

                <div className={styles.infoCard}>
                  <label>Đăng nhập gần nhất</label>
                  <span className={styles.dateText}>
                    {formatDateTimeVN(data?.lastLoginAt) || "Chưa thực hiện"}
                  </span>
                </div>
              </div>

              <div className={styles.historySection}>
                <h3 className={styles.sectionTitle}>Lịch sử đặt vé gần đây</h3>

                <div className={styles.bookingList}>
                  {(data?.bookings ?? []).length === 0 ? (
                    <div className={styles.emptyHistory}>
                      <p>
                        Hành khách này chưa thực hiện giao dịch nào trên hệ
                        thống.
                      </p>
                    </div>
                  ) : (
                    (data?.bookings ?? []).map((booking: any) => (
                      <div
                        key={booking.bookingId}
                        className={styles.bookingItem}
                      >
                        <div className={styles.bookingMain}>
                          <span className={styles.bookingCode}>
                            {booking.bookingCode}
                          </span>

                          <span className={styles.bookingRoute}>
                            {booking.originCityName ?? "---"} →{" "}
                            {booking.destinationCityName ?? "---"}
                          </span>

                          <span className={styles.bookingDate}>
                            Khởi hành:{" "}
                            {formatDateTimeVN(booking.departureDatetime) ||
                              "---"}
                          </span>

                          <span className={styles.bookingDate}>
                            Đặt lúc:{" "}
                            {formatDateTimeVN(booking.createdAt) || "---"}
                          </span>
                        </div>

                        <div className={styles.bookingSide}>
                          <span
                            className={`${styles.statusBadge} ${getStatusClass(
                              booking.status,
                            )}`}
                          >
                            {bookingStatusLabel(booking.status)}
                          </span>

                          <span className={styles.paymentText}>
                            Thanh toán: {booking.paymentMethod ?? "Chưa có"}
                          </span>

                          <span className={styles.paymentText}>
                            Trạng thái:{" "}
                            {booking.paymentStatus ?? "Chưa thanh toán"}
                          </span>

                          <span className={styles.seatText}>
                            {booking.seatCount ?? 0} ghế
                          </span>

                          <strong className={styles.bookingPrice}>
                            {Number(booking.totalAmount ?? 0).toLocaleString(
                              "vi-VN",
                            )}
                            đ
                          </strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
