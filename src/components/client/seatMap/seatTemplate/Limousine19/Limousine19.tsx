"use client";

import { useMemo, Fragment } from "react";

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
  // =========================
  // MAX COLUMN
  // =========================
  const maxCol = useMemo(
    () => Math.max(...seats.map((s) => s.columnNo)),
    [seats],
  );

  // =========================
  // GROUP COLUMNS
  // =========================
  const columns = useMemo(() => {
    const cols = [...new Set(seats.map((s) => s.columnNo))].sort(
      (a, b) => b - a,
    );

    return cols.map((colNo) => ({
      colNo,

      seats: seats
        .filter((s) => s.columnNo === colNo)
        .sort((a, b) => b.rowNo - a.rowNo),
    }));
  }, [seats]);

  // =========================
  // SELECTED
  // =========================
  const isSelected = (seatId: number) =>
    selectedSeats.some((s) => s.seatId === seatId);

  return (
    <CarFrame>
      <div className={styles.limoCabin}>
        {columns.map((col) => (
          <div key={col.colNo} className={styles.limoCol}>
            {col.seats.map((seat, index) => (
              <Fragment key={seat.seatId}>
                <SeatItem
                  seat={seat}
                  selected={isSelected(seat.seatId)}
                  onSelect={onSelectSeat}
                />

                {col.colNo !== maxCol && index === 1 && (
                  <div className={styles.aisleSpace} />
                )}
              </Fragment>
            ))}
          </div>
        ))}
      </div>
    </CarFrame>
  );
}
