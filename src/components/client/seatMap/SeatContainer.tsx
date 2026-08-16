"use client";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useTripSeats } from "@/hooks/client/useSeat";

import type { Seat } from "@/types/client/seat/seat.type";

import Sleeper40 from "../seatMap/seatTemplate/Sleeper40/Sleeper40";
import Limousine19 from "../seatMap/seatTemplate/Limousine19/Limousine19";
import CabinVip22 from "../seatMap/seatTemplate/CabinVip22/CabinVip22";
import Limousine9 from "../seatMap/seatTemplate/Limousine9/Limousine9";

import SeatLegend from "./SeatLegend";
import BookingSummary from "../seatMap/summary/BookingSummary";

import { useBookingStore } from "@/store/booking.store";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

import ErrorRenderer from "@/lib/error/error.renderer";
import { useHoldSeats, useReleaseSeats } from "@/hooks/client/useBooking";

import styles from "./SeatContainer.module.css";
function generateSessionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
export default function SeatContainer() {
  const {
    outboundSeats,
    returnSeats,
    outboundTrip,
    returnTrip,
    activeJourney,
    isRoundTrip,
    setActiveJourney,
    toggleSeat,
    setHoldExpiredAt,
  } = useBookingStore();
  const router = useRouter();
  const currentTrip = activeJourney === "OUTBOUND" ? outboundTrip : returnTrip;

  const { mutateAsync: holdSeats } = useHoldSeats();
  const { mutateAsync: releaseSeats } = useReleaseSeats();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem("session_id");

    if (!id) {
      id = generateSessionId();
      localStorage.setItem("session_id", id);
    }

    setSessionId(id);
  }, []);

  const query = useTripSeats(currentTrip?.id, sessionId ?? undefined);
  const { data, isPending, isFetching, isError, error } = query;
  const releaseAllSelectedSeats = async () => {
    if (!sessionId) return;

    if (outboundTrip && outboundSeats.length > 0) {
      await releaseSeats({
        tripId: outboundTrip.id,
        seatLayoutDetailIds: outboundSeats.map((seat) => seat.seatId),
        sessionId,
      });
    }

    if (returnTrip && returnSeats.length > 0) {
      await releaseSeats({
        tripId: returnTrip.id,
        seatLayoutDetailIds: returnSeats.map((seat) => seat.seatId),
        sessionId,
      });
    }
  };
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      router.replace("/trips");
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  const handleChooseAnotherTrip = async () => {
    try {
      await releaseAllSelectedSeats();

      useBookingStore.getState().clearSeats();

      router.push("/trips");
    } catch (error) {
      console.error(error);
      toast.error("Không thể hủy ghế đã chọn");
    }
  };

  const selectedSeats =
    activeJourney === "OUTBOUND" ? outboundSeats : returnSeats;
  const MAX_SEATS = 5;
  const handleRetry = () => {
    void query.refetch();
  };

  const handleSelectSeat = async (seat: Seat) => {
    if (!currentTrip || !sessionId) return;

    const isSelected = selectedSeats.some(
      (selectedSeat) => selectedSeat.seatId === seat.seatId,
    );

    // BỎ CHỌN
    if (isSelected || seat.isHeldByMe) {
      try {
        await releaseSeats({
          tripId: currentTrip.id,
          seatLayoutDetailIds: [seat.seatId],
          sessionId,
        });

        if (isSelected) {
          toggleSeat({
            seatId: seat.seatId,
            seatNumber: seat.seatNumber,
            price: currentTrip.price,
          });
        }

        await query.refetch();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Không thể bỏ chọn ghế");
      }

      return;
    }

    // GHẾ ĐANG BỊ NGƯỜI KHÁC GIỮ
    if (seat.status !== "AVAILABLE") {
      toast.error("Ghế này không còn trống");
      return;
    }

    if (selectedSeats.length >= MAX_SEATS) {
      toast.error("Bạn chỉ được chọn tối đa 5 ghế");
      return;
    }

    // GIỮ GHẾ
    try {
      const result = await holdSeats({
        tripId: currentTrip.id,
        seatLayoutDetailIds: [seat.seatId],
        sessionId,
      });
      setHoldExpiredAt(result.expiredAt);

      toggleSeat({
        seatId: seat.seatId,
        seatNumber: seat.seatNumber,
        price: currentTrip.price,
      });

      await query.refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Không thể giữ ghế");
    }
  };

  if (!currentTrip) {
    return (
      <div className={styles.noTripContainer}>
        <div className={styles.noTripCard}>
          <div className={styles.noTripIcon}>🚌</div>

          <h2 className={styles.noTripTitle}>Chưa chọn chuyến</h2>

          <p className={styles.noTripDescription}>
            Vui lòng chọn chuyến đi trước khi chọn ghế.
          </p>

          <button
            type="button"
            onClick={() => router.push("/trips")}
            className={styles.chooseTripButton}
          >
            ← Chọn chuyến
          </button>
        </div>
      </div>
    );
  }
  if (isPending && !data) {
    return <BlockSkeleton height={500} />;
  }

  if (isError && !data) {
    return <ErrorRenderer error={error} onRetry={handleRetry} />;
  }
  if (!currentTrip) {
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
  if (!data) {
    return (
      <ErrorRenderer
        error={{
          response: {
            status: 404,
          },
        }}
        onRetry={handleRetry}
      />
    );
  }

  const commonProps = {
    seats: data.seats,
    selectedSeats,
    onSelectSeat: handleSelectSeat,
  };

  const renderLayout = () => {
    const vehicleName = data.vehicleName?.toLowerCase();

    if (vehicleName?.includes("limousine") && data.totalSeats === 19) {
      return <Limousine19 {...commonProps} />;
    }

    if (vehicleName?.includes("cabin") || data.totalSeats === 24) {
      return <CabinVip22 {...commonProps} />;
    }

    if (data.totalSeats === 40) {
      return <Sleeper40 {...commonProps} />;
    }

    if (data.totalSeats === 9) {
      return <Limousine9 {...commonProps} />;
    }

    return (
      <div className={styles.unsupportedLayout}>
        🚧 Xe này chưa hỗ trợ sơ đồ ghế
        <br />
        Vui lòng chọn xe khác hoặc liên hệ hỗ trợ
      </div>
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.main}>
        {isError && (
          <div className={styles.errorBanner}>
            Không thể cập nhật trạng thái ghế mới nhất.
            <button
              type="button"
              onClick={handleRetry}
              className={styles.retryButton}
            >
              Thử lại
            </button>
          </div>
        )}
        <div className={styles.changeTripContainer}>
          <button
            type="button"
            onClick={handleChooseAnotherTrip}
            className={styles.changeTripButton}
          >
            ← Chọn chuyến khác
          </button>
        </div>
        {isRoundTrip && (
          <div className={styles.journeyTabs}>
            <button
              className={
                activeJourney === "OUTBOUND" ? styles.activeTab : styles.tab
              }
              onClick={() => setActiveJourney("OUTBOUND")}
            >
              Chọn ghế chuyến đi
            </button>

            <button
              className={
                activeJourney === "RETURN" ? styles.activeTab : styles.tab
              }
              onClick={() => setActiveJourney("RETURN")}
            >
              Chọn ghế chuyến về
            </button>
          </div>
        )}
        <BlockErrorBoundary fallback={<BlockSkeleton height={400} />}>
          {renderLayout()}
        </BlockErrorBoundary>

        {isFetching && !isPending && !isError && (
          <div
            style={{
              marginTop: 10,
              color: "#64748b",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Đang cập nhật trạng thái ghế...
          </div>
        )}
      </div>

      <aside className={styles.sidebar}>
        <BlockErrorBoundary fallback={<BlockSkeleton height={200} />}>
          <BookingSummary />
        </BlockErrorBoundary>

        <BlockErrorBoundary fallback={<BlockSkeleton height={100} />}>
          <SeatLegend />
        </BlockErrorBoundary>
      </aside>
    </div>
  );
}
