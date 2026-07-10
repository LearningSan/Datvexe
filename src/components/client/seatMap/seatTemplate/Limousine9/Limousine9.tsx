"use client";

import { useMemo } from "react";

import SeatItem from "../../seatItem/SeatItem";

import styles from "./Limousine9.module.css";

import Wheel from "../../carPart/wheel/Wheel";

import { Seat } from "@/types/client/seat/seat.type";
import { BookingSeat } from "@/types/client/booking/booking-seat.type";

interface Props {
  seats: Seat[];

  selectedSeats: BookingSeat[];

  onSelectSeat: (seat: Seat) => void;
}

export default function Limousine9Seat({
  seats,
  selectedSeats,
  onSelectSeat,
}: Props) {
  const frontSeats = useMemo(() => {
    return seats.filter((s) => s.seatNumber === "A4" || s.seatNumber === "A9");
  }, [seats]);

  const gridSeats = useMemo(() => {
    return seats.filter((s) => s.columnNo !== 4);
  }, [seats]);

  const isSelected = (id: number) => selectedSeats.some((s) => s.seatId === id);

  // =========================
  // GROUP BY ROW
  // =========================
  const rows = useMemo(() => {
    const rowNumbers = [...new Set(gridSeats.map((s) => s.rowNo))];

    return rowNumbers
      .sort((a, b) => a - b)
      .map((rowNo) => {
        const rowSeats = gridSeats
          .filter((s) => s.rowNo === rowNo)
          .sort((a, b) => a.columnNo - b.columnNo);

        return {
          rowNo,

          seats: rowSeats,
        };
      });
  }, [gridSeats]);

  const renderCell = (seat?: Seat) => {
    if (!seat) {
      return <div className={styles.aisleSpace} />;
    }

    return (
      <SeatItem
        seat={seat}
        selected={isSelected(seat.seatId)}
        onSelect={onSelectSeat}
      />
    );
  };

  // =========================
  // IMPORTANT: fill missing columns
  // =========================
  const MAX_COL = 3;

  return (
    <div className={styles.busFrame}>
      <Wheel />

      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.limoCabin}>
            {rows.map((row) => {
              const seatMap = new Map<number, Seat>();

              row.seats.forEach((s) => {
                seatMap.set(s.columnNo, s);
              });

              return (
                <div key={row.rowNo} className={styles.limoRow}>
                  {Array.from({
                    length: MAX_COL,
                  }).map((_, index) => {
                    const colNo = index + 1;

                    const seat = seatMap.get(colNo);

                    return (
                      <div key={colNo}>
                        {seat ? (
                          renderCell(seat)
                        ) : (
                          <div className={styles.aisleSpace} />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.front}>
          <div className={styles.driver}>
            <div className={styles.driverIcon} />

            <span>TÀI XẾ</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.frontSeats}>
            {frontSeats.map((seat) => (
              <SeatItem
                key={seat.seatId}
                seat={seat}
                selected={isSelected(seat.seatId)}
                onSelect={onSelectSeat}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.autoDoorStrip}>CỬA TỰ ĐỘNG</div>
    </div>
  );
}
