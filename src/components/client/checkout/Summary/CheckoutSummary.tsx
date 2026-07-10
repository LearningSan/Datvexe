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
  const selectedTrip = useBookingStore((s) => s.selectedTrip);
  const selectedSeats = useBookingStore((s) => s.selectedSeats);
  const subtotal = useBookingStore((s) => s.subtotal);
  const promotionDiscount = useBookingStore((s) => s.promotionDiscount);
  const totalPrice = useBookingStore((s) => s.totalPrice);
  const passenger = useBookingStore((s) => s.passenger);
  const pickupMethod = useBookingStore((s) => s.pickupMethod);
  const dropoffMethod = useBookingStore((s) => s.dropoffMethod);
  const pickupPointId = useBookingStore((s) => s.pickupPointId);
  const dropoffPointId = useBookingStore((s) => s.dropoffPointId);
  const pickupAddress = useBookingStore((s) => s.pickupAddress);
  const dropoffAddress = useBookingStore((s) => s.dropoffAddress);
  const acceptedTerms = useBookingStore((s) => s.acceptedTerms);
  const setPromotion = useBookingStore((s) => s.setPromotion);
  const clearPromotion = useBookingStore((s) => s.clearPromotion);
  const setSubmitted = useBookingStore((s) => s.setSubmitted);
  const promotionCode = useBookingStore((s) => s.promotionCode);
  const createBooking = useCreateBooking();
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

  const weekday = useMemo(() => {
    if (!selectedTrip) return "";
    return new Intl.DateTimeFormat("vi-VN", { weekday: "long" }).format(
      new Date(selectedTrip.departureDateTime),
    );
  }, [selectedTrip]);

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
    if (pickupMethod === "OFFICE" && !pickupPointId) {
      setErrorMessage("Vui lòng chọn điểm đón tại bến");
      return;
    }
    if (pickupMethod === "SHUTTLE" && !pickupAddress?.address?.trim()) {
      setErrorMessage("Vui lòng nhập địa chỉ trung chuyển đón");
      return;
    }
    if (dropoffMethod === "OFFICE" && !dropoffPointId) {
      setErrorMessage("Vui lòng chọn điểm trả tại bến");
      return;
    }
    if (dropoffMethod === "SHUTTLE" && !dropoffAddress?.address?.trim()) {
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
        tripId: selectedTrip.id,
        sessionId,
        promoCode: promotionCode ?? null,
        seats: selectedSeats.map((s) => ({
          seatLayoutDetailId: s.seatId,
          seatPrice: s.price,
        })),
        contactName: passenger.fullName,
        contactPhone: passenger.phone,
        contactEmail: passenger.email,
        pickup: {
          pickupPointId: pickupPointId ?? undefined,
          method: pickupMethod,
          address: pickupAddress?.address ?? undefined,
          latitude: pickupAddress?.latitude,
          longitude: pickupAddress?.longitude,
        },
        dropoff: {
          pickupPointId: dropoffPointId ?? undefined,
          method: dropoffMethod,
          address: dropoffAddress?.address ?? undefined,
          latitude: dropoffAddress?.latitude,
          longitude: dropoffAddress?.longitude,
        },
      };
      const res = await createBooking.mutateAsync(payload);
      const raw = sessionStorage.getItem("active_seat_hold");
      if (raw) {
        const oldHold = JSON.parse(raw);
        sessionStorage.setItem(
          "active_seat_hold",
          JSON.stringify({ ...oldHold, bookingId: res.bookingId }),
        );
      }
      router.push(`/payment/${res.bookingId}`);
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
          <span className={styles.value}>{selectedTrip.originCity}</span>
        </div>
        <div className={styles.routeDivider}>→</div>
        <div className={styles.routeItem} style={{ textAlign: "right" }}>
          <span className={styles.label}>Điểm đến</span>
          <span className={styles.value}>{selectedTrip.destinationCity}</span>
        </div>
      </div>

      {/* THÔNG TIN CHI TIẾT LỊCH TRÌNH */}
      <div className={styles.section}>
        <div className={styles.row}>
          <span className={styles.lbl}>Khởi hành</span>
          <span className={`${styles.val} ${styles.green}`}>
            {selectedTrip.departureTime}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.lbl}>Ngày đi</span>
          <span className={styles.val}>
            {weekday},{" "}
            {new Date(selectedTrip.departureDateTime).toLocaleDateString(
              "vi-VN",
            )}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.lbl}>Loại xe</span>
          <span className={styles.val}>{selectedTrip.type}</span>
        </div>

        <div className={styles.divider} />

        <div className={styles.row}>
          <span className={styles.lbl}>Ghế đã chọn</span>
          <span className={`${styles.val} ${styles.blueHighlight}`}>
            {selectedSeats.length > 0
              ? selectedSeats.map((s) => s.seatNumber).join(", ")
              : "Chưa chọn"}
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.lbl}>Số lượng ghế</span>
          <span className={styles.val}>{selectedSeats.length} / 5 ghế</span>
        </div>

        <div className={styles.row}>
          <span className={styles.lbl}>Giá vé</span>
          <span className={styles.val}>
            {selectedTrip.price.toLocaleString("vi-VN")}đ
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
