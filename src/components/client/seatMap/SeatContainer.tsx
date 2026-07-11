"use client";

import { toast } from "sonner";

import { useTripSeats } from "@/hooks/client/useSeat";

import type { TripSeatResponse } from "@/types/client/seat/seat-response.type";
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

import styles from "./SeatContainer.module.css";

interface Props {
  tripId: number;
  initialData: TripSeatResponse;
}

export default function SeatContainer({ tripId, initialData }: Props) {
  const query = useTripSeats(tripId, initialData);

  const { data, isPending, isFetching, isError, error } = query;

  const handleRetry = () => {
    void query.refetch();
  };

  const { selectedSeats, toggleSeat, selectedTrip } = useBookingStore();

  const MAX_SEATS = 5;

  if (isPending && !data) {
    return <BlockSkeleton height={500} />;
  }

  if (isError && !data) {
    return <ErrorRenderer error={error} onRetry={handleRetry} />;
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
  const handleSelectSeat = (seat: Seat) => {
    if (seat.status !== "AVAILABLE") {
      return;
    }

    const isSelected = selectedSeats.some(
      (selectedSeat) => selectedSeat.seatId === seat.seatId,
    );

    if (!isSelected && selectedSeats.length >= MAX_SEATS) {
      toast.warning("Bạn chỉ được chọn tối đa 5 ghế");
      return;
    }

    toggleSeat({
      seatId: seat.seatId,
      seatNumber: seat.seatNumber,
      price: selectedTrip?.price ?? 0,
    });
  };

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
      <div
        style={{
          padding: 20,
          textAlign: "center",
          color: "#aaa",
          border: "1px dashed #444",
          borderRadius: 12,
        }}
      >
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
          <div
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: "#fff7ed",
              color: "#9a3412",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Không thể cập nhật trạng thái ghế mới nhất.
            <button
              type="button"
              onClick={handleRetry}
              style={{
                marginLeft: 8,
              }}
            >
              Thử lại
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
