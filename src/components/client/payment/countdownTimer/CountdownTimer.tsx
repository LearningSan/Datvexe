"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";

import styles from "./CountdownTimer.module.css";

interface CountdownTimerProps {
  expiredAt: string | null;
  onExpired: () => void;
}

export default function CountdownTimer({
  expiredAt,
  onExpired,
}: CountdownTimerProps) {
  const onExpiredRef = useRef(onExpired);
  const expiredCalledRef = useRef(false);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  const calcSeconds = useCallback(() => {
    if (!expiredAt) {
      return 0;
    }

    const diff = Math.floor(
      (new Date(expiredAt).getTime() - Date.now()) / 1000,
    );

    return Math.max(0, diff);
  }, [expiredAt]);

  const [secondsLeft, setSecondsLeft] = useState(() => calcSeconds());

  useEffect(() => {
    // Chưa có expiredAt thì không chạy timer
    if (!expiredAt) {
      setSecondsLeft(0);
      return;
    }

    expiredCalledRef.current = false;

    const update = () => {
      const seconds = calcSeconds();

      setSecondsLeft(seconds);

      if (seconds <= 0 && !expiredCalledRef.current) {
        expiredCalledRef.current = true;
        onExpiredRef.current();
      }
    };

    // Tính ngay khi mount
    update();

    const interval = window.setInterval(update, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [expiredAt, calcSeconds]);

  // Chưa có thời gian hết hạn thì không render countdown
  if (!expiredAt) {
    return null;
  }

  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");

  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  const isUrgent = secondsLeft <= 60;

  const pct = Math.min(100, (secondsLeft / (10 * 60)) * 100);

  return (
    <div className={`${styles.wrapper} ${isUrgent ? styles.urgent : ""}`}>
      <span>⏳</span>

      <span>
        Thời gian giữ chỗ còn lại{" "}
        <strong>
          {minutes} : {seconds}
        </strong>
      </span>

      <div className={styles.bar}>
        <div
          className={`${styles.fill} ${isUrgent ? styles.fillUrgent : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
