"use client";

import { useMemo, Fragment, useEffect } from "react";

import SeatItem from "../../seatItem/SeatItem";

import CarFrame from "../../carPart/frame/CarFrame";

import styles from "./Limousine19.module.css";

import { Seat } from "@/types/client/seat/seat.type";
import { BookingSeat } from "@/types/client/booking/booking-seat.type";

interface Props {
  seats: Seat[];

  selectedSeats: BookingSeat[];

  onSelectSeat: (seat: Seat) => void;
}

export default function Limousine19Seat({
  seats,

  selectedSeats,

  onSelectSeat,
}: Props) {
  const rows = useMemo(() => {
    const rowNos = [...new Set(seats.map((s) => s.rowNo))].sort(
      (a, b) => a - b,
    );
    return rowNos.map((rowNo) => ({
      rowNo,
      seats: seats
        .filter((s) => s.rowNo === rowNo)
        .sort((a, b) => b.columnNo - a.columnNo),
    }));
  }, [seats]);

  const isSelected = (seatId: number) =>
    selectedSeats.some((s) => s.seatId === seatId);

  return (
    <CarFrame>
      <div className={styles.limoCabin}>
        {rows.map((row) => (
          <div key={row.rowNo} className={styles.limoRow}>
            {row.seats.map((seat, index) => (
              <Fragment key={seat.seatId}>
                <SeatItem
                  seat={seat}
                  selected={isSelected(seat.seatId)}
                  onSelect={onSelectSeat}
                />

                {row.rowNo === 3 && (
                  <div className={styles.aisleLane}>
                    <span>LỐI ĐI CHUNG</span>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        ))}
      </div>
    </CarFrame>
  );
}
