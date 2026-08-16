"use client";

import { useMemo } from "react";

import Sleeper40Seat from "@/components/client/seatMap/seatTemplate/Sleeper40/Sleeper40";
import Limousine19Seat from "@/components/client/seatMap/seatTemplate/Limousine19/Limousine19";
import Limousine9Seat from "@/components/client/seatMap/seatTemplate/Limousine9/Limousine9";
import CabinVip22 from "@/components/client/seatMap/seatTemplate/CabinVip22/CabinVip22";

import type { Seat } from "@/types/client/seat/seat.type";
import type { BookingSeat } from "@/types/client/booking/booking-seat.type";
import type { AdminTicketAvailableSeat } from "@/types/admin/tickets/ticket-management.type";

interface Props {
  seats: AdminTicketAvailableSeat[];

  layoutName: string | null;

  mode: "CHANGE" | "ADD";

  selectedSeatIds: number[];

  selectedOldBookingSeatIds: number[];

  onSelectSeat: (seatId: number) => void;
}

export default function AdminSeatMap({
  seats,
  layoutName,
  mode,
  selectedSeatIds,
  selectedOldBookingSeatIds,
  onSelectSeat,
}: Props) {
  const mappedSeats = useMemo<Seat[]>(() => {
    return seats.map((seat) => ({
      seatId: seat.seatLayoutDetailId,
      seatNumber: seat.seatNumber,

      seatType: "NORMAL",

      floorNo: seat.floorNo,
      rowNo: seat.rowNo,
      columnNo: seat.columnNo,

      status: seat.seatStatus,

      isHeldByMe: false,
    }));
  }, [seats]);

  const selectedSeats = useMemo<BookingSeat[]>(() => {
    return selectedSeatIds.map(
      (seatId) =>
        ({
          seatId,
        }) as BookingSeat,
    );
  }, [selectedSeatIds]);

  const handleSelectSeat = (seat: Seat) => {
    const source = seats.find(
      (item) => item.seatLayoutDetailId === seat.seatId,
    );
    if (!source) return;

    if (mode === "ADD") {
      if (source.seatStatus !== "AVAILABLE") {
        return;
      }

      onSelectSeat(source.seatLayoutDetailId);
      return;
    }

    if (source.isCurrentBooking) {
      return;
    }

    if (source.seatStatus !== "AVAILABLE") {
      return;
    }

    onSelectSeat(source.seatLayoutDetailId);
  };

  const normalizedLayout = (layoutName ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, "");
  if (
    normalizedLayout.includes("sleeper40") ||
    normalizedLayout.includes("sleeper") ||
    normalizedLayout.includes("giuongnam40") ||
    normalizedLayout.includes("giuongnam40cho")
  ) {
    return (
      <Sleeper40Seat
        seats={mappedSeats}
        selectedSeats={selectedSeats}
        onSelectSeat={handleSelectSeat}
      />
    );
  }

  if (
    normalizedLayout.includes("limousine19") ||
    normalizedLayout.includes("limo19")
  ) {
    return (
      <Limousine19Seat
        seats={mappedSeats}
        selectedSeats={selectedSeats}
        onSelectSeat={handleSelectSeat}
      />
    );
  }

  if (
    normalizedLayout.includes("limousine9") ||
    normalizedLayout.includes("limo9")
  ) {
    return (
      <Limousine9Seat
        seats={mappedSeats}
        selectedSeats={selectedSeats}
        onSelectSeat={handleSelectSeat}
      />
    );
  }

  if (
    normalizedLayout.includes("cabinvip22") ||
    normalizedLayout.includes("vip22")
  ) {
    return (
      <CabinVip22
        seats={mappedSeats}
        selectedSeats={selectedSeats}
        onSelectSeat={handleSelectSeat}
      />
    );
  }

  return (
    <div>
      Không xác định được sơ đồ ghế:{" "}
      <strong>{layoutName ?? "Không có layout"}</strong>
    </div>
  );
}
