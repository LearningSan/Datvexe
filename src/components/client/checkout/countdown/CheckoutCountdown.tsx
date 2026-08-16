"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./CheckoutCountdown.module.css";

interface Props {
  expiredAt: string;
  onExpired: () => void;
}

export default function CheckoutCountdown({ expiredAt, onExpired }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(
      0,
      Math.floor((new Date(expiredAt).getTime() - Date.now()) / 1000),
    ),
  );

  const expiredCalledRef = useRef(false);
  const onExpiredRef = useRef(onExpired);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    expiredCalledRef.current = false;

    const update = () => {
      const seconds = Math.max(
        0,
        Math.floor((new Date(expiredAt).getTime() - Date.now()) / 1000),
      );

      setSecondsLeft(seconds);

      if (seconds <= 0 && !expiredCalledRef.current) {
        expiredCalledRef.current = true;
        onExpiredRef.current();
      }
    };

    update();

    const interval = window.setInterval(update, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [expiredAt]);

  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");

  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  const isUrgent = secondsLeft <= 60;

  return (
    <div className={`${styles.wrapper} ${isUrgent ? styles.urgent : ""}`}>
      <span>⏳</span>

      <span>
        Thời gian giữ ghế còn lại{" "}
        <strong>
          {minutes}:{seconds}
        </strong>
      </span>

      <span className={styles.description}>
        Hết thời gian, ghế sẽ tự động được hủy.
      </span>
    </div>
  );
}
