"use client";

import styles from "./BookingSummary.module.css";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useBookingStore } from "@/store/booking.store";
import { useHoldSeats } from "@/hooks/client/useBooking";

function generateSessionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
export default function BookingSummary() {
  const router = useRouter();
  const { mutateAsync: holdSeats, isPending } = useHoldSeats();
  const { selectedTrip, selectedSeats, totalPrice } = useBookingStore();

  const weekday = useMemo(() => {
    if (!selectedTrip) return "";
    return new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(
      new Date(selectedTrip.departureDateTime),
    );
  }, [selectedTrip]);

  if (!selectedTrip) return null;

  const handleConfirmSeat = async () => {
    if (selectedSeats.length === 0) return;

    try {
      let sessionId = localStorage.getItem("session_id");
      if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem("session_id", sessionId);
      }

      await holdSeats({
        tripId: selectedTrip.id,
        seatLayoutDetailIds: selectedSeats.map((seat) => seat.seatId),
        sessionId,
      });

      sessionStorage.setItem(
        "active_seat_hold",
        JSON.stringify({
          bookingId: null,
          tripId: selectedTrip.id,
          sessionId,
        }),
      );
      router.push(`/checkout/${selectedTrip.id}`);
    } catch (error: any) {
      console.error(error);
      alert(error?.response?.data?.message || "Không thể giữ ghế");
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>Thông tin đặt vé</div>

      {/* ROUTE */}
      <div className={styles.route}>
        <div className={styles.routeItem}>
          <span className={styles.label}>Điểm đi</span>
          <span className={styles.value}>{selectedTrip.originCity}</span>
        </div>

        <div className={styles.routeDivider}>→</div>

        <div className={styles.routeItem}>
          <span className={styles.label}>Điểm đến</span>
          <span className={styles.value}>{selectedTrip.destinationCity}</span>
        </div>
      </div>

      {/* INFO */}
      <div className={styles.section}>
        <div className={styles.row}>
          <span>Khởi hành</span>
          <span>{selectedTrip.departureTime}</span>
        </div>

        <div className={styles.row}>
          <span>Ngày đi</span>
          <span>
            {weekday},{" "}
            {new Date(selectedTrip.departureDateTime).toLocaleDateString(
              "vi-VN",
            )}
          </span>
        </div>

        <div className={styles.row}>
          <span>Loại xe</span>
          <span>{selectedTrip.type}</span>
        </div>

        <div className={styles.row}>
          <span>Ghế đã chọn</span>
          <span>
            {selectedSeats.length > 0
              ? selectedSeats.map((seat) => seat.seatNumber).join(", ")
              : "Chưa chọn"}
          </span>
        </div>

        <div className={styles.row}>
          <span>Số lượng ghế</span>
          <span>{selectedSeats.length}</span>
        </div>

        <div className={styles.row}>
          <span>Giá vé</span>
          <span>{selectedTrip.price.toLocaleString("vi-VN")}đ</span>
        </div>
      </div>

      {/* TOTAL */}
      <div className={styles.totalBox}>
        <span>Tổng cộng</span>
        <span className={styles.totalPrice}>
          {(totalPrice ?? 0).toLocaleString("vi-VN")}đ
        </span>
      </div>

      {/* BUTTON */}
      <button
        className={styles.confirmButton}
        onClick={handleConfirmSeat}
        disabled={selectedSeats.length === 0 || isPending}
      >
        {isPending ? "Đang giữ ghế..." : "Xác nhận chọn ghế"}
      </button>
    </div>
  );
}
