"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import styles from "./CountdownTimer.module.css";

interface CountdownTimerProps {
  expiredAt: string;
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
    const diff = Math.floor(
      (new Date(expiredAt).getTime() - Date.now()) / 1000,
    );

    return Math.max(0, diff);
  }, [expiredAt]);

  const [secondsLeft, setSecondsLeft] = useState(() => calcSeconds());

  useEffect(() => {
    expiredCalledRef.current = false;
    setSecondsLeft(calcSeconds());

    const interval = setInterval(() => {
      const seconds = calcSeconds();
      setSecondsLeft(seconds);

      if (seconds <= 0 && !expiredCalledRef.current) {
        expiredCalledRef.current = true;
        clearInterval(interval);
        onExpiredRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiredAt, calcSeconds]);

  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");

  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  const isUrgent = secondsLeft <= 60;
  const pct = Math.min(100, (secondsLeft / (10 * 60)) * 100);

  return (
    <div className={`${styles.wrapper} ${isUrgent ? styles.urgent : ""}`}>
      <div className={styles.text}>
        <span className={styles.icon}>⏳</span>
        Thời gian giữ chỗ còn lại&nbsp;
        <span className={styles.time}>
          {minutes} : {seconds}
        </span>
      </div>

      <div className={styles.bar}>
        <div
          className={`${styles.fill} ${isUrgent ? styles.fillUrgent : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
