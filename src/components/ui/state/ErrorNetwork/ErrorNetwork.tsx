"use client";

import styles from "./ErrorNetwork.module.css";

export default function ErrorNetwork({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.icon}>🔌</div>

        <h1 className={styles.title}>Mất kết nối Internet</h1>

        <p className={styles.desc}>
          Vui lòng kiểm tra WiFi hoặc dữ liệu di động.
        </p>

        <button
          className={styles.btn}
          onClick={() => {
            if (onRetry) {
              onRetry();
            } else {
              window.location.reload();
            }
          }}
        >
          Tải lại
        </button>
      </div>
    </div>
  );
}