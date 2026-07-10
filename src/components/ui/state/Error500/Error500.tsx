"use client";

import styles from "./Error500.module.css";

export default function Error500({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>500</h1>

      <h2 className={styles.subtitle}>Hệ thống gặp lỗi</h2>

      <p className={styles.desc}>
        Máy chủ đang gặp sự cố. Vui lòng thử lại sau.
      </p>

      {onRetry && (
        <button onClick={onRetry} className={styles.btn}>
          Thử lại
        </button>
      )}
    </div>
  );
}