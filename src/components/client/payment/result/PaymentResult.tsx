"use client";

import React from "react";
import styles from "./PaymentResult.module.css";
import { useRouter } from "next/navigation";

interface SuccessProps {
  bookingCode: string;
  showDetails: boolean;
  onToggleDetails: () => void;
}

interface FailedProps {
  bookingId?: number;
  onRetry: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}
export function PaymentSuccess({
  bookingCode,
  showDetails,
  onToggleDetails,
}: SuccessProps) {
  const router = useRouter();

  return (
    <div className={styles.resultCard}>
      <div className={`${styles.iconBadge} ${styles.successBadge}`}>✓</div>
      <h2 className={`${styles.title} ${styles.successTitle}`}>
        Đặt vé thành công!
      </h2>
      <p className={styles.subText}>
        Hệ thống đã xác nhận thanh toán. Thông tin vé điện tử (e-ticket) đang
        được gửi qua SMS và Email đăng ký của bạn.
      </p>

      <div className={styles.quickInfo}>
        <span>Mã đặt vé của bạn</span>
        <span className={styles.bookingCodeHighlight}>{bookingCode}</span>
      </div>

      <div className={styles.btnGroup}>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={onToggleDetails}
        >
          {showDetails ? "Ẩn chi tiết hành trình" : "Xem chi tiết vé vừa đặt"}
        </button>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => router.push("/home")}
        >
          Quay về trang chủ
        </button>
      </div>
    </div>
  );
}

// ============================================================

export function PaymentFailed({
  bookingId,
  onRetry,
  showDetails,
  onToggleDetails,
}: FailedProps) {
  const router = useRouter();

  return (
    <div className={styles.resultCard}>
      <div className={`${styles.iconBadge} ${styles.failedBadge}`}>✕</div>
      <h2 className={`${styles.title} ${styles.failedTitle}`}>
        Thanh toán thất bại
      </h2>
      <p className={styles.subText}>
        Giao dịch không thành công từ phía nhà cung cấp dịch vụ thẻ/ví điện tử.
        Vị trí ghế của bạn vẫn đang được hệ thống giữ tạm thời.
      </p>

      <div className={styles.btnGroup}>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={onToggleDetails}
        >
          {showDetails ? "Ẩn chi tiết" : "Xem thông tin vé đang giữ"}
        </button>

        {bookingId && (
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => router.push(`/payment/${bookingId}`)}
          >
            Quay lại trang thanh toán
          </button>
        )}

        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => router.push("/home")}
        >
          Quay về trang chủ
        </button>

        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={onRetry}
        >
          Chọn phương thức khác
        </button>
      </div>
    </div>
  );
}

// ============================================================

export function PaymentExpired({ bookingId }: { bookingId?: number }) {
  const router = useRouter();

  return (
    <div className={styles.resultCard}>
      <div className={`${styles.iconBadge} ${styles.expiredBadge}`}>⏰</div>
      <h2 className={`${styles.title} ${styles.expiredTitle}`}>
        Giao dịch hết thời gian
      </h2>
      <p className={styles.subText}>
        Thời gian giữ chỗ giới hạn 10 phút đã kết thúc trước khi quá trình
        chuyển khoản hoàn tất. Ghế đã tự động giải phóng.
      </p>

      <div className={styles.btnGroup}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => router.push("/trips")}
        >
          Tìm và đặt chuyến khác
        </button>
        {bookingId && (
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => router.push(`/payment/${bookingId}`)}
          >
            Quay lại trang thanh toán
          </button>
        )}
      </div>
    </div>
  );
}
