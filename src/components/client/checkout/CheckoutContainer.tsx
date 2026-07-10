"use client";

import { useState, useEffect } from "react";
import styles from "./CheckoutContainer.module.css";

import PassengerForm from "./PassengerForm/PassengerForm";
import PickupDropoff from "./PickupDropoff/PickupDropoff";
import CheckoutSummary from "./Summary/CheckoutSummary";
import TermsSection from "./TermsSection/TermsSection";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

import { useBookingStore } from "@/store/booking.store";
import { useCancelSeatHoldOnExit } from "@/hooks/client/useCancelSeatHoldOnExit";

interface Props {
  tripId: number;
}

export default function CheckoutContainer({ tripId }: Props) {
  useCancelSeatHoldOnExit();

  const acceptedTerms = useBookingStore((s) => s.acceptedTerms);
  const setAcceptedTerms = useBookingStore((s) => s.setAcceptedTerms);
  const [termError, setTermError] = useState(false);

  const clearPromotion = useBookingStore((s) => s.clearPromotion);
  const hydrated = useBookingStore((s) => s.hydrated);

  useEffect(() => {
    return () => {
      clearPromotion();
    };
  }, [clearPromotion]);

  if (!hydrated) {
    return <BlockSkeleton height={500} />;
  }

  return (
    <div className={styles.wrapper}>
      {/* LEFT SECTION - Sử dụng CSS Grid mới */}
      <div className={styles.leftGrid}>
        {/* CỘT 1: Form hành khách & Điều khoản */}
        <div className={styles.columnLeft}>
          <BlockErrorBoundary fallback={<BlockSkeleton height={180} />}>
            <PassengerForm />
          </BlockErrorBoundary>
        </div>

        {/* CỘT 2: Điểm đón & Điểm trả */}
        <div className={styles.columnRight}>
          <BlockErrorBoundary fallback={<BlockSkeleton height={180} />}>
            <PickupDropoff tripId={tripId} />
          </BlockErrorBoundary>
        </div>
        <div className={styles.fullWidthRow}>
          <BlockErrorBoundary fallback={<div>Lỗi điều khoản</div>}>
            <TermsSection
              accepted={acceptedTerms}
              onChange={setAcceptedTerms}
              error={termError}
            />
          </BlockErrorBoundary>
        </div>
      </div>

      {/* RIGHT SECTION - Tổng quan vé (Giữ nguyên) */}
      <aside className={styles.right}>
        <BlockErrorBoundary fallback={<BlockSkeleton height={300} />}>
          <CheckoutSummary />
        </BlockErrorBoundary>
      </aside>
    </div>
  );
}
