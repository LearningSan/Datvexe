"use client";

import { useEffect, useState } from "react";

import styles from "./CheckoutContainer.module.css";

import PassengerForm from "./PassengerForm/PassengerForm";
import PickupDropoff from "./PickupDropoff/PickupDropoff";
import CheckoutSummary from "./Summary/CheckoutSummary";
import TermsSection from "./TermsSection/TermsSection";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";
import BlockErrorState from "@/components/common/BlockErrorState";

import ErrorRenderer from "@/lib/error/error.renderer";

import { useBookingStore } from "@/store/booking.store";
import { useCancelSeatHoldOnExit } from "@/hooks/client/useCancelSeatHoldOnExit";

interface Props {
  tripId: number;
}

export default function CheckoutContainer({ tripId }: Props) {
  useCancelSeatHoldOnExit();

  const acceptedTerms = useBookingStore((state) => state.acceptedTerms);

  const setAcceptedTerms = useBookingStore((state) => state.setAcceptedTerms);

  const clearPromotion = useBookingStore((state) => state.clearPromotion);

  const hydrated = useBookingStore((state) => state.hydrated);

  // Dữ liệu bắt buộc của trang checkout
  const selectedTrip = useBookingStore((state) => state.selectedTrip);

  const selectedSeats = useBookingStore((state) => state.selectedSeats);

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

  if (!selectedTrip || selectedSeats.length === 0) {
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
  if (selectedTrip.id !== tripId) {
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
            <PickupDropoff tripId={tripId} />
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
