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

  const {
    isRoundTrip,
    outboundTrip,
    returnTrip,
    outboundSeats,
    returnSeats,
    totalPrice,
    setActiveJourney,
  } = useBookingStore();

  const outboundWeekday = useMemo(() => {
    if (!outboundTrip) return "";

    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
    }).format(new Date(outboundTrip.departureDateTime));
  }, [outboundTrip]);

  const returnWeekday = useMemo(() => {
    if (!returnTrip) return "";

    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
    }).format(new Date(returnTrip.departureDateTime));
  }, [returnTrip]);
  const outboundTotal = useMemo(
    () => outboundSeats.reduce((sum, seat) => sum + seat.price, 0),
    [outboundSeats],
  );

  const returnTotal = useMemo(
    () => returnSeats.reduce((sum, seat) => sum + seat.price, 0),
    [returnSeats],
  );
  if (!outboundTrip) return null;

  const handleConfirmSeat = async () => {
    if (
      outboundSeats.length === 0 ||
      (isRoundTrip && returnSeats.length === 0)
    ) {
      return;
    }

    try {
      let sessionId = localStorage.getItem("session_id");

      if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem("session_id", sessionId);
      }

      await holdSeats({
        tripId: outboundTrip.id,
        seatLayoutDetailIds: outboundSeats.map((seat) => seat.seatId),
        sessionId,
      });

      if (isRoundTrip && returnTrip) {
        await holdSeats({
          tripId: returnTrip.id,
          seatLayoutDetailIds: returnSeats.map((seat) => seat.seatId),
          sessionId,
        });
      }

      sessionStorage.setItem(
        "active_seat_hold",
        JSON.stringify({
          bookingId: null,
          sessionId,
          outboundTripId: outboundTrip.id,
          returnTripId: returnTrip?.id ?? null,
        }),
      );
      setActiveJourney("OUTBOUND");
      if (isRoundTrip && returnTrip) {
        router.push(
          `/checkout/${outboundTrip.id}?returnTripId=${returnTrip.id}`,
        );
      } else {
        router.push(`/checkout/${outboundTrip.id}`);
      }
    } catch (error: any) {
      console.error(error);
      alert(error?.response?.data?.message || "Không thể giữ ghế");
    }
  };

  return (
    <div className={styles.summary}>
      <h3>Thông tin đặt vé</h3>

      {/* ROUTE */}
      <div className={styles.route}>
        <div className={styles.routeItem}>
          <span className={styles.label}>Điểm đi</span>
          <span className={styles.value}>{outboundTrip.originCity}</span>
        </div>

        <div className={styles.routeDivider}>→</div>

        <div className={styles.routeItem}>
          <span className={styles.label}>Điểm đến</span>
          <span className={styles.value}>{outboundTrip.destinationCity}</span>
        </div>
      </div>

      {/* INFO */}
      <div className={styles.section}>
        <div className={styles.row}>
          <span>Ngày đi</span>
          <span>
            {" "}
            <span>{outboundTrip.departureTime}</span> {outboundWeekday},{" "}
            {new Date(outboundTrip.departureDateTime).toLocaleDateString(
              "vi-VN",
            )}
          </span>
        </div>

        {isRoundTrip && returnTrip && (
          <>
            <div className={styles.row}>
              <span>Ngày về</span>
              <span>
                {" "}
                <span>{returnTrip.departureTime}</span> {returnWeekday},{" "}
                {new Date(returnTrip.departureDateTime).toLocaleDateString(
                  "vi-VN",
                )}
              </span>
            </div>
          </>
        )}

        {!isRoundTrip ? (
          <div className={styles.row}>
            <span>Loại xe</span>
            <span>{outboundTrip.type}</span>
          </div>
        ) : (
          <>
            <div className={styles.row}>
              <span>Loại xe chuyến đi</span>
              <span>{outboundTrip.type}</span>
            </div>

            {returnTrip && (
              <div className={styles.row}>
                <span>Loại xe chuyến về</span>
                <span>{returnTrip.type}</span>
              </div>
            )}
          </>
        )}

        <div className={styles.row}>
          <span>Ghế chuyến đi</span>
          <span>
            {outboundSeats.length
              ? outboundSeats.map((seat) => seat.seatNumber).join(", ")
              : "Chưa chọn"}
          </span>
        </div>

        {isRoundTrip && (
          <div className={styles.row}>
            <span>Ghế chuyến về</span>
            <span>
              {returnSeats.length
                ? returnSeats.map((seat) => seat.seatNumber).join(", ")
                : "Chưa chọn"}
            </span>
          </div>
        )}

        <div className={styles.row}>
          <span>Số lượng ghế</span>
          <span>{outboundSeats.length + returnSeats.length}</span>
        </div>

        <div className={styles.row}>
          <span>Giá chuyến đi</span>

          <span>
            {outboundTrip.price.toLocaleString("vi-VN")}đ ×{" "}
            {outboundSeats.length}
            {" = "}
            <strong>{outboundTotal.toLocaleString("vi-VN")}đ</strong>
          </span>
        </div>

        {isRoundTrip && returnTrip && (
          <div className={styles.row}>
            <span>Giá chuyến về</span>

            <span>
              {returnTrip.price.toLocaleString("vi-VN")}đ × {returnSeats.length}
              {" = "}
              <strong>{returnTotal.toLocaleString("vi-VN")}đ</strong>
            </span>
          </div>
        )}
      </div>

      {/* TOTAL */}
      <div className={styles.totalBox}>
        <span>Tổng cộng</span>
        <span className={styles.totalPrice}>
          {totalPrice.toLocaleString("vi-VN")}đ
        </span>
      </div>

      {/* BUTTON */}
      <button
        className={styles.confirmButton}
        onClick={handleConfirmSeat}
        disabled={
          outboundSeats.length === 0 ||
          (isRoundTrip && returnSeats.length === 0) ||
          isPending
        }
      >
        {isPending ? "Đang giữ ghế..." : "Xác nhận chọn ghế"}
      </button>
    </div>
  );
}
