"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./MockPaymentSuccess.module.css";

export default function MockPaymentSuccessContainer() {
  const searchParams = useSearchParams();

  const bookingCode = searchParams.get("bookingCode");
  const transactionCode = searchParams.get("transactionCode");

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        {/* Badge thông báo môi trường test */}
        <div className={styles.headerRow}>
          <span className={styles.badge}>Môi trường thử nghiệm</span>
        </div>

        {/* Icon thành công được làm mới */}
        <div className={styles.iconContainer}>
          <div className={styles.iconBadge}>✓</div>
        </div>

        <h1 className={styles.title}>Thanh toán thành công!</h1>

        <p className={styles.description}>
          Giao dịch của bạn đã được hệ thống ghi nhận thành công. Vui lòng kiểm
          tra lại trạng thái vé.
        </p>

        <div className={styles.detailsCard}>
          {bookingCode && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Mã đặt vé</span>
              <span className={`${styles.value} ${styles.bookingCode}`}>
                {bookingCode}
              </span>
            </div>
          )}

          {transactionCode && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Mã giao dịch</span>
              <span className={styles.value}>{transactionCode}</span>
            </div>
          )}

          <div className={styles.detailRow}>
            <span className={styles.label}>Trạng thái</span>
            <span className={styles.statusBadge}>Thành công</span>
          </div>
        </div>
        <div className={styles.noteBox}>
          Vé điện tử đã được tạo thành công. Bạn có thể xem lại thông tin vé
          trong mục "Lịch sử đặt vé".
        </div>

        <div className={styles.buttonGroup}>
          <Link href="/home" className={styles.primaryBtn}>
            Quay về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
