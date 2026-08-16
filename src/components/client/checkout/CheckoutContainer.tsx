"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./CheckoutContainer.module.css";
import toast from "react-hot-toast";
import CheckoutCountdown from "./countdown/CheckoutCountdown";
import PassengerForm from "./PassengerForm/PassengerForm";
import PickupDropoff from "./PickupDropoff/PickupDropoff";
import CheckoutSummary from "./Summary/CheckoutSummary";
import TermsSection from "./TermsSection/TermsSection";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";
import BlockErrorState from "@/components/common/BlockErrorState";

import ErrorRenderer from "@/lib/error/error.renderer";

import { useBookingStore } from "@/store/booking.store";
import { useReleaseSeats } from "@/hooks/client/useBooking";
interface Props {
  tripId: number;
}

export default function CheckoutContainer({ tripId }: Props) {
  const router = useRouter();
  const acceptedTerms = useBookingStore((state) => state.acceptedTerms);

  const setAcceptedTerms = useBookingStore((state) => state.setAcceptedTerms);

  const clearPromotion = useBookingStore((state) => state.clearPromotion);
  const { mutateAsync: releaseSeats } = useReleaseSeats();
  const hydrated = useBookingStore((state) => state.hydrated);

  // Dữ liệu bắt buộc của trang checkout
  const {
    activeJourney,

    outboundTrip,
    returnTrip,

    outboundSeats,
    returnSeats,
    holdExpiredAt,
  } = useBookingStore();
  const currentTrip = activeJourney === "OUTBOUND" ? outboundTrip : returnTrip;

  const currentSeats =
    activeJourney === "OUTBOUND" ? outboundSeats : returnSeats;

  const [termError, setTermError] = useState(false);

  useEffect(() => {
    return () => {
      clearPromotion();
    };
  }, [clearPromotion]);

  // Store Zustand chưa khôi phục xong
  if (!hydrated) {
    return <BlockSkeleton height={500} />;
  }

  // tripId trên URL không hợp lệ
  if (!Number.isFinite(tripId) || tripId <= 0) {
    return (
      <ErrorRenderer
        error={{
          response: {
            status: 404,
          },
        }}
      />
    );
  }
  const handleHoldExpired = async () => {
    toast.error("Thời gian giữ ghế đã hết.");

    const sessionId = localStorage.getItem("session_id");

    if (!sessionId) {
      useBookingStore.getState().resetBooking();
      router.replace("/trips");
      return;
    }

    try {
      // Hủy ghế chuyến đi
      if (outboundTrip && outboundSeats.length > 0) {
        await releaseSeats({
          tripId: outboundTrip.id,
          seatLayoutDetailIds: outboundSeats.map((seat) => seat.seatId),
          sessionId,
        });
      }

      // Hủy ghế chuyến về
      if (returnTrip && returnSeats.length > 0) {
        await releaseSeats({
          tripId: returnTrip.id,
          seatLayoutDetailIds: returnSeats.map((seat) => seat.seatId),
          sessionId,
        });
      }
    } catch (error) {
      console.error("Không thể hủy ghế khi hết thời gian:", error);
    } finally {
      useBookingStore.getState().resetBooking();
      router.replace("/trips");
    }
  };
  if (!currentTrip || currentSeats.length === 0) {
    return (
      <ErrorRenderer
        error={{
          response: {
            status: 400,
            data: {
              message: "Vui lòng chọn chuyến và ghế trước khi thanh toán.",
            },
          },
        }}
      />
    );
  }
  if (outboundTrip?.id !== tripId) {
    return (
      <ErrorRenderer
        error={{
          response: {
            status: 404,
            data: {
              message: "Thông tin chuyến không khớp với phiên đặt vé.",
            },
          },
        }}
      />
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.leftGrid}>
        <div className={styles.columnLeft}>
          <BlockErrorBoundary
            fallback={
              <BlockErrorState
                height={180}
                title="Form hành khách gặp lỗi"
                message="Không thể hiển thị form thông tin hành khách."
              />
            }
          >
            <PassengerForm />
          </BlockErrorBoundary>
        </div>
        <div className={styles.columnRight}>
          <BlockErrorBoundary
            fallback={
              <BlockErrorState
                height={180}
                title="Thông tin đón trả gặp lỗi"
                message="Không thể hiển thị khu vực chọn điểm đón và điểm trả."
              />
            }
          >
            <PickupDropoff tripId={currentTrip.id} />{" "}
          </BlockErrorBoundary>
        </div>
        <div className={styles.fullWidthRow}>
          <BlockErrorBoundary
            fallback={
              <BlockErrorState
                height={120}
                title="Điều khoản gặp lỗi"
                message="Không thể hiển thị điều khoản đặt vé."
              />
            }
          >
            <BlockErrorBoundary fallback={<BlockSkeleton height={80} />}>
              {holdExpiredAt && (
                <CheckoutCountdown
                  expiredAt={holdExpiredAt}
                  onExpired={handleHoldExpired}
                />
              )}
            </BlockErrorBoundary>
            <TermsSection
              accepted={acceptedTerms}
              onChange={(checked) => {
                setAcceptedTerms(checked);

                if (checked) {
                  setTermError(false);
                }
              }}
              error={termError}
            />
          </BlockErrorBoundary>
        </div>
      </div>

      <aside className={styles.right}>
        <BlockErrorBoundary
          fallback={
            <BlockErrorState
              height={300}
              title="Tóm tắt đặt vé gặp lỗi"
              message="Không thể hiển thị thông tin tóm tắt đặt vé."
            />
          }
        >
          <CheckoutSummary />
        </BlockErrorBoundary>
      </aside>
    </div>
  );
}
