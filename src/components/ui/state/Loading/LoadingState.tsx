"use client";

import styles from "./LoadingState.module.css";

export default function LoadingState() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.loader} />
      <p className={styles.text}>Đang tải...</p>
    </div>
  );
}