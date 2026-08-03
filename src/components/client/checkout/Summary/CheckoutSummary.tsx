"use client";
import styles from "./CheckoutSummary.module.css";
import { useMemo, useState } from "react";
import { useBookingStore } from "@/store/booking.store";
import { useValidatePromotion } from "@/hooks/client/usePromotion";
import { useRouter } from "next/navigation";

import { useCancelHold } from "@/hooks/client/usePayment";
import PromotionInput from "../Promotion/PromotionInput";
import { useCreateBooking } from "@/hooks/client/useBooking";
import { clearActiveSeatHold } from "@/hooks/client/useCancelSeatHoldOnExit";

export default function CheckoutSummary() {
  const {
    activeJourney,

    outboundTrip,
    returnTrip,

    outboundSeats,
    returnSeats,

    outboundRoute,
    returnRoute,

    subtotal,
    promotionDiscount,
    totalPrice,

    passenger,

    acceptedTerms,
    promotionCode,

    setPromotion,
    clearPromotion,
    setSubmitted,
  } = useBookingStore();
  const selectedTrip =
    activeJourney === "OUTBOUND" ? outboundTrip : (returnTrip ?? outboundTrip);

  const currentRoute =
    activeJourney === "OUTBOUND" ? outboundRoute : returnRoute;

  const outboundSeatPrice = outboundSeats.reduce(
    (sum, seat) => sum + seat.price,
    0,
  );

  const returnSeatPrice = returnSeats.reduce(
    (sum, seat) => sum + seat.price,
    0,
  );

  const selectedSeats =
    activeJourney === "OUTBOUND" ? outboundSeats : returnSeats;

  const createBooking = useCreateBooking();
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
  const validatePromotion = useValidatePromotion();
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState("");
  const { mutateAsync: cancelHold } = useCancelHold();

  const handleCancelBooking = async () => {
    try {
      if (!selectedTrip) return;
      const sessionId = localStorage.getItem("session_id");
      if (!sessionId) return;

      sessionStorage.setItem("hold_cancelled", "1");
      await cancelHold({
        bookingId: null,
        sessionId,
        tripId: selectedTrip.id,
      });

      clearActiveSeatHold();
      router.push(`/trips/${selectedTrip.id}`);
    } catch (error) {
      console.error(error);
      sessionStorage.removeItem("hold_cancelled");
      setErrorMessage("Không thể hủy giữ ghế");
    }
  };

  const handleApplyPromotion = async (code: string) => {
    if (!selectedTrip) return;
    try {
      const res = await validatePromotion.mutateAsync({
        code,
        tripId: selectedTrip.id,
        subtotal,
      });
      setPromotion(res.code, res.discount);
      setErrorMessage("");
    } catch (err) {
      setErrorMessage("Mã giảm giá không hợp lệ hoặc đã hết hạn");
    }
  };

  const handleConfirmBooking = async () => {
    setSubmitted(true);
    setErrorMessage("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

    if (!passenger.fullName.trim() || passenger.fullName.trim().length < 2) {
      setErrorMessage("Họ tên không hợp lệ (tối thiểu 2 ký tự)");
      return;
    }
    if (!phoneRegex.test(passenger.phone.trim())) {
      setErrorMessage("Số điện thoại không hợp lệ");
      return;
    }
    if (!emailRegex.test(passenger.email.trim())) {
      setErrorMessage("Email không hợp lệ");
      return;
    }
    if (selectedSeats.length === 0) {
      setErrorMessage("Vui lòng chọn ghế");
      return;
    }
    if (currentRoute.pickupMethod === "OFFICE" && !currentRoute.pickupPointId) {
      setErrorMessage("Vui lòng chọn điểm đón tại bến");
      return;
    }
    if (
      currentRoute.pickupMethod === "SHUTTLE" &&
      !currentRoute.pickupAddress?.address?.trim()
    ) {
      setErrorMessage("Vui lòng nhập địa chỉ trung chuyển đón");
      return;
    }
    if (
      currentRoute.dropoffMethod === "OFFICE" &&
      !currentRoute.dropoffPointId
    ) {
      setErrorMessage("Vui lòng chọn điểm trả tại bến");
      return;
    }
    if (
      currentRoute.dropoffMethod === "SHUTTLE" &&
      !currentRoute.dropoffAddress?.address?.trim()
    ) {
      setErrorMessage("Vui lòng nhập địa chỉ trung chuyển trả");
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage("Bạn chưa đồng ý với điều khoản đặt vé");
      return;
    }
    if (!selectedTrip) return;

    try {
      const sessionId = localStorage.getItem("session_id");

      if (!sessionId) {
        setErrorMessage("Không tìm thấy session");
        return;
      }
      const payload = {
        sessionId,

        contactName: passenger.fullName,
        contactPhone: passenger.phone,
        contactEmail: passenger.email,

        promoCode: promotionCode ?? null,

        outbound: {
          tripId: outboundTrip!.id,

          seats: outboundSeats.map((seat) => ({
            seatLayoutDetailId: seat.seatId,
            seatPrice: seat.price,
          })),

          pickup: {
            pickupPointId: outboundRoute.pickupPointId ?? undefined,
            method: outboundRoute.pickupMethod,
            address: outboundRoute.pickupAddress?.address,
            latitude: outboundRoute.pickupAddress?.latitude,
            longitude: outboundRoute.pickupAddress?.longitude,
          },

          dropoff: {
            pickupPointId: outboundRoute.dropoffPointId ?? undefined,
            method: outboundRoute.dropoffMethod,
            address: outboundRoute.dropoffAddress?.address,
            latitude: outboundRoute.dropoffAddress?.latitude,
            longitude: outboundRoute.dropoffAddress?.longitude,
          },
        },

        return: returnTrip
          ? {
              tripId: returnTrip.id,

              seats: returnSeats.map((seat) => ({
                seatLayoutDetailId: seat.seatId,
                seatPrice: seat.price,
              })),

              pickup: {
                pickupPointId: returnRoute.pickupPointId ?? undefined,
                method: returnRoute.pickupMethod,
                address: returnRoute.pickupAddress?.address,
                latitude: returnRoute.pickupAddress?.latitude,
                longitude: returnRoute.pickupAddress?.longitude,
              },

              dropoff: {
                pickupPointId: returnRoute.dropoffPointId ?? undefined,
                method: returnRoute.dropoffMethod,
                address: returnRoute.dropoffAddress?.address,
                latitude: returnRoute.dropoffAddress?.latitude,
                longitude: returnRoute.dropoffAddress?.longitude,
              },
            }
          : undefined,
      };
      console.log(payload);
      const result = await createBooking.mutateAsync(payload);
      console.log(result);
      const bookingIds = result.bookingIds;

      const raw = sessionStorage.getItem("active_seat_hold");

      if (raw) {
        const old = JSON.parse(raw);

        sessionStorage.setItem(
          "active_seat_hold",
          JSON.stringify({
            ...old,
            bookingIds,
          }),
        );
      }
      router.push(`/payment?bookingIds=${bookingIds.join(",")}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Không thể tạo booking";
      setErrorMessage(msg);
    }
  };

  if (!selectedTrip) return null;

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.header}>Thông tin thanh toán</h3>

      {/* LỘ TRÌNH CHUYẾN ĐI TUYẾN XE */}
      <div className={styles.route}>
        <div className={styles.routeItem}>
          <span className={styles.label}>Điểm đi</span>
          <span className={styles.value}>{outboundTrip?.originCity}</span>
        </div>
        <div className={styles.routeDivider}>→</div>
        <div className={styles.routeItem} style={{ textAlign: "right" }}>
          <span className={styles.label}>Điểm đến</span>
          <span className={styles.value}>{outboundTrip?.destinationCity}</span>
        </div>
      </div>

      {/* THÔNG TIN CHI TIẾT LỊCH TRÌNH */}
      <div className={styles.section}>
        {/* ===== CHUYẾN ĐI ===== */}

        <div className={styles.row}>
          <span className={styles.lbl}>Khởi hành</span>

          <span className={`${styles.val} ${styles.green}`}>
            {outboundTrip?.departureTime}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.lbl}>Ngày đi</span>

          <span className={styles.val}>
            {outboundWeekday},{" "}
            {outboundTrip &&
              new Date(outboundTrip.departureDateTime).toLocaleDateString(
                "vi-VN",
              )}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.lbl}>Ghế chuyến đi</span>

          <span className={`${styles.val} ${styles.blueHighlight}`}>
            {outboundSeats.length
              ? outboundSeats.map((s) => s.seatNumber).join(", ")
              : "Chưa chọn"}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.lbl}>Giá chuyến đi</span>

          <span className={styles.val}>
            {outboundSeatPrice.toLocaleString("vi-VN")}đ
            {outboundSeats.length > 0 && ` (x${outboundSeats.length})`}
          </span>
        </div>

        {/* ===== CHUYẾN VỀ ===== */}

        {returnTrip && (
          <>
            <div className={styles.divider} />

            <div className={styles.row}>
              <span className={styles.lbl}>Khởi hành về</span>

              <span className={`${styles.val} ${styles.green}`}>
                {returnTrip.departureTime}
              </span>
            </div>

            <div className={styles.row}>
              <span className={styles.lbl}>Ngày về</span>

              <span className={styles.val}>
                {returnWeekday},{" "}
                {new Date(returnTrip.departureDateTime).toLocaleDateString(
                  "vi-VN",
                )}
              </span>
            </div>

            <div className={styles.row}>
              <span className={styles.lbl}>Ghế chuyến về</span>

              <span className={`${styles.val} ${styles.blueHighlight}`}>
                {returnSeats.length
                  ? returnSeats.map((s) => s.seatNumber).join(", ")
                  : "Chưa chọn"}
              </span>
            </div>

            <div className={styles.row}>
              <span className={styles.lbl}>Giá chuyến về</span>

              <span className={styles.val}>
                {returnSeatPrice.toLocaleString("vi-VN")}đ
                {returnSeats.length > 0 && ` (x${returnSeats.length})`}
              </span>
            </div>
          </>
        )}

        <div className={styles.divider} />

        <div className={styles.row}>
          <span className={styles.lbl}>Tổng số ghế</span>

          <span className={styles.val}>
            {outboundSeats.length + returnSeats.length} / 10 ghế
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.lbl}>Tạm tính</span>

          <span className={styles.val}>
            {subtotal.toLocaleString("vi-VN")}đ
          </span>
        </div>
      </div>

      {/* BLOCK NHẬP MÃ GIẢM GIÁ */}
      <div className={styles.promoWrapper}>
        <PromotionInput
          onApply={handleApplyPromotion}
          onClear={clearPromotion}
          discountText={
            promotionDiscount > 0
              ? `Đã giảm: ${promotionDiscount.toLocaleString("vi-VN")}đ`
              : ""
          }
        />
      </div>

      {/* KHỐI TỔNG TIỀN BIÊN LAI */}
      <div className={styles.totalBox}>
        <div className={styles.totalLeft}>
          <span className={styles.totalLbl}>Tổng cộng</span>
          {promotionDiscount > 0 && (
            <div className={styles.discount}>
              Tiết kiệm: -{promotionDiscount.toLocaleString("vi-VN")}đ
            </div>
          )}
        </div>
        <span className={styles.totalPrice}>
          {totalPrice.toLocaleString("vi-VN")}đ
        </span>
      </div>

      {/* ERROR FEEDBACK */}
      {errorMessage && (
        <div className={styles.errorBox}>
          <span className={styles.errorIcon}>⚠</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KHU VỰC CÁC NÚT ĐIỀU HƯỚNG */}
      <div className={styles.btnGroup}>
        <button className={styles.confirmButton} onClick={handleConfirmBooking}>
          Xác nhận đặt vé
        </button>
        <button className={styles.cancelButton} onClick={handleCancelBooking}>
          Hủy đặt vé
        </button>
      </div>
    </div>
  );
}
