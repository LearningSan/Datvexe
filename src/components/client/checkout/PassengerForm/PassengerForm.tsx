"use client";

import { useEffect } from "react";

import styles from "./PassengerForm.module.css";

import { useCurrentUser } from "@/hooks/client/useUser";
import { useBookingStore } from "@/store/booking.store";

const GUEST_PASSENGER_KEY = "guest_passenger";

export default function PassengerForm() {
  const { data, isLoading } = useCurrentUser();

  const passenger = useBookingStore((s) => s.passenger);
  const setPassenger = useBookingStore((s) => s.setPassenger);
  const submitted = useBookingStore((s) => s.submitted);

  useEffect(() => {
    if (isLoading) return;

    if (data) {
      setPassenger({
        fullName: data.fullName || "",
        phone: data.phone || "",
        email: data.email || "",
      });

      return;
    }

    try {
      const raw = localStorage.getItem(GUEST_PASSENGER_KEY);

      if (!raw) return;

      const saved = JSON.parse(raw);

      setPassenger({
        fullName: saved.fullName || "",
        phone: saved.phone || "",
        email: saved.email || "",
      });
    } catch (error) {
      console.error("[PASSENGER] Không thể đọc thông tin guest:", error);

      localStorage.removeItem(GUEST_PASSENGER_KEY);
    }
  }, [data, isLoading, setPassenger]);

  const updatePassenger = (
    field: "fullName" | "phone" | "email",
    value: string,
  ) => {
    const nextPassenger = {
      ...passenger,
      [field]: value,
    };

    setPassenger({
      [field]: value,
    });

    if (!data) {
      try {
        localStorage.setItem(
          GUEST_PASSENGER_KEY,
          JSON.stringify(nextPassenger),
        );
      } catch (error) {
        console.error("[PASSENGER] Không thể lưu thông tin guest:", error);
      }
    }
  };

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

  const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

  if (!passenger.phone.trim()) {
    errors.phone = "Vui lòng nhập số điện thoại";
  } else if (!phoneRegex.test(passenger.phone.trim())) {
    errors.phone = "Số điện thoại không hợp lệ";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!passenger.email.trim()) {
    errors.email = "Vui lòng nhập email";
  } else if (!emailRegex.test(passenger.email.trim())) {
    errors.email = "Email không hợp lệ";
  }

  return (
    <div>
      <h2>Thông tin hành khách</h2>
      <div className={styles.form}>
        <div className={styles.group}>
          <label>Họ và tên</label>
          <input
            placeholder="Nhập họ và tên"
            value={passenger.fullName}
            onChange={(e) => updatePassenger("fullName", e.target.value)}
            className={`${styles.input} ${
              submitted && errors.fullName ? styles.inputError : ""
            }`}
          />
          {submitted && errors.fullName && (
            <div className={styles.error}>{errors.fullName}</div>
          )}
        </div>
        <div className={styles.group}>
          <label>Số điện thoại</label>
          <input
            placeholder="Nhập số điện thoại"
            value={passenger.phone}
            onChange={(e) => updatePassenger("phone", e.target.value)}
            className={`${styles.input} ${
              submitted && errors.phone ? styles.inputError : ""
            }`}
          />
          {submitted && errors.phone && (
            <div className={styles.error}>{errors.phone}</div>
          )}
        </div>
        <div className={styles.group}>
          <label>Email</label>
          <input
            type="email"
            placeholder="Nhập địa chỉ email"
            value={passenger.email}
            onChange={(e) => updatePassenger("email", e.target.value)}
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
