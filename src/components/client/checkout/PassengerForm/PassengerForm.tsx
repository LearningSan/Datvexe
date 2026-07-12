"use client";

import { useEffect } from "react";

import styles from "./PassengerForm.module.css";

import { useCurrentUser } from "@/hooks/client/useUser";
import { useBookingStore } from "@/store/booking.store";

export default function PassengerForm() {
  const { data } = useCurrentUser();

  const passenger = useBookingStore((s) => s.passenger);
  const setPassenger = useBookingStore((s) => s.setPassenger);

  const submitted = useBookingStore((s) => s.submitted);

  useEffect(() => {
    if (!data) return;

    setPassenger({
      fullName: data.fullName || "",
      phone: data.phone || "",
      email: data.email || "",
    });
  }, [data, setPassenger]);

  const errors = {
    fullName: "",
    phone: "",
    email: "",
  };

  if (!passenger.fullName.trim()) {
    errors.fullName = "Vui lòng nhập họ tên";
  } else if (passenger.fullName.trim().length < 2) {
    errors.fullName = "Họ tên không hợp lệ";
  }

  // PHONE
  const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

  if (!passenger.phone.trim()) {
    errors.phone = "Vui lòng nhập số điện thoại";
  } else if (!phoneRegex.test(passenger.phone.trim())) {
    errors.phone = "Số điện thoại không hợp lệ";
  }

  // EMAIL
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!passenger.email.trim()) {
    errors.email = "Vui lòng nhập email";
  } else if (!emailRegex.test(passenger.email.trim())) {
    errors.email = "Email không hợp lệ";
  }

  return (
    <div className={styles.wrapper}>
      <span
        style={{
          position: "absolute",
          top: "-12px",
          left: "24px",
          background: "#2563eb",
          color: "white",
          padding: "2px 12px",
          borderRadius: "20px",
          fontSize: "11px",
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Thông tin bắt buộc
      </span>
      <div className={styles.header}>Thông tin hành khách</div>

      <div className={styles.form}>
        {/* FULLNAME */}
        <div className={styles.group}>
          <label>Họ và tên</label>

          <input
            value={passenger.fullName}
            onChange={(e) =>
              setPassenger({
                fullName: e.target.value,
              })
            }
            className={`${styles.input} ${
              submitted && errors.fullName ? styles.inputError : ""
            }`}
          />

          {submitted && errors.fullName && (
            <div className={styles.error}>{errors.fullName}</div>
          )}
        </div>

        {/* PHONE */}
        <div className={styles.group}>
          <label>Số điện thoại</label>

          <input
            value={passenger.phone}
            onChange={(e) =>
              setPassenger({
                phone: e.target.value,
              })
            }
            className={`${styles.input} ${
              submitted && errors.phone ? styles.inputError : ""
            }`}
          />

          {submitted && errors.phone && (
            <div className={styles.error}>{errors.phone}</div>
          )}
        </div>

        {/* EMAIL */}
        <div className={styles.group}>
          <label>Email</label>

          <input
            value={passenger.email}
            onChange={(e) =>
              setPassenger({
                email: e.target.value,
              })
            }
            className={`${styles.input} ${
              submitted && errors.email ? styles.inputError : ""
            }`}
          />

          {submitted && errors.email && (
            <div className={styles.error}>{errors.email}</div>
          )}
        </div>
      </div>
    </div>
  );
}
