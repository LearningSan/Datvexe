"use client";
import { toast } from "sonner";
import { useTripSeats } from "@/hooks/client/useSeat";

import { TripSeatResponse } from "@/types/client/seat/seat-response.type";
import { Seat } from "@/types/client/seat/seat.type";

import Sleeper40 from "../seatMap/seatTemplate/Sleeper40/Sleeper40";
import Limousine19 from "../seatMap/seatTemplate/Limousine19/Limousine19";
import CabinVip22 from "../seatMap/seatTemplate/CabinVip22/CabinVip22";
import Limousine9 from "../seatMap/seatTemplate/Limousine9/Limousine9";

import SeatLegend from "./SeatLegend";
import BookingSummary from "../seatMap/summary/BookingSummary";

import { useBookingStore } from "@/store/booking.store";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

import styles from "./SeatContainer.module.css";

interface Props {
  tripId: number;
  initialData: TripSeatResponse;
}

export default function SeatContainer({ tripId, initialData }: Props) {
  const { data, isLoading, error } = useTripSeats(tripId, initialData);

  const { selectedSeats, toggleSeat, selectedTrip } = useBookingStore();
  const MAX_SEATS = 5;

  if (isLoading) {
    return <BlockSkeleton height={500} />;
  }

  if (error || !data) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "#999" }}>
        Không tải được dữ liệu ghế
      </div>
    );
  }
  const handleSelectSeat = (seat: Seat) => {
    if (seat.status !== "AVAILABLE") {
      return;
    }

    const isSelected = selectedSeats.some((s) => s.seatId === seat.seatId);

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
        <BlockErrorBoundary fallback={<BlockSkeleton height={400} />}>
          {renderLayout()}
        </BlockErrorBoundary>
      </div>

      <aside className={styles.sidebar}>
        <BlockErrorBoundary fallback={<BlockSkeleton height={200} />}>
          <BookingSummary />
        </BlockErrorBoundary>

        <SeatLegend />
      </aside>
    </div>
  );
}
