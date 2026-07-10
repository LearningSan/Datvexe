"use client";

import styles from "./CabinVip22.module.css";

import CarFrame from "../../carPart/frame/CarFrame";

import SeatItem from "../../seatItem/SeatItem";

import { Seat } from "@/types/client/seat/seat.type";
import { BookingSeat } from "@/types/client/booking/booking-seat.type";

interface Props {
  seats: Seat[];

  selectedSeats: BookingSeat[];

  onSelectSeat: (seat: Seat) => void;
}

// =========================
// FIND SEAT
// =========================
const getSeat = (
  seats: Seat[],

  floorNo: number,

  rowNo: number,

  columnNo: number,
) => {
  return seats.find(
    (s) =>
      s.floorNo === floorNo && s.rowNo === rowNo && s.columnNo === columnNo,
  );
};

export default function CabinVip22({
  seats,

  selectedSeats,

  onSelectSeat,
}: Props) {
  // =========================
  // SELECTED
  // =========================
  const isSelected = (seatId: number) =>
    selectedSeats.some((s) => s.seatId === seatId);

  // =========================
  // RENDER SEAT
  // =========================
  const renderSeat = (seat: Seat) => (
    <SeatItem
      key={seat.seatId}
      seat={seat}
      selected={isSelected(seat.seatId)}
      onSelect={onSelectSeat}
    />
  );

  // =========================
  // RENDER FLOOR
  // =========================
  const renderFloor = (floorNo: number) => {
    const isFloor1 = floorNo === 1;

    return (
      <>
        {/* ===== ROW 1 ===== */}
        <div className={styles.seatsRowGroup}>
          {Array.from({
            length: 6,
          }).map((_, i) => {
            const seat = getSeat(
              seats,

              floorNo,

              1,

              i + 1,
            );

            return seat ? (
              renderSeat(seat)
            ) : (
              <div key={i} className={styles.emptyCell} />
            );
          })}
        </div>

        {/* ===== AISLE ===== */}
        <div className={styles.aisleLane}>
          <span>LỐI ĐI CHUNG</span>
        </div>

        {/* ===== ROW 2 ===== */}
        <div className={styles.seatsRowGroup}>
          {isFloor1 ? (
            <div className={styles.wcItem}>WC</div>
          ) : (
            <div className={styles.emptyCell} />
          )}

          {Array.from({
            length: 5,
          }).map((_, i) => {
            const seat = getSeat(
              seats,

              floorNo,

              3,

              i + 1,
            );

            return seat ? (
              renderSeat(seat)
            ) : (
              <div key={i} className={styles.emptyCell} />
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className={styles.cabinContainer}>
      {/* ===== FLOOR 1 ===== */}
      <div className={styles.floorSection}>
        <h2 className={styles.floorTitle}>TẦNG 1</h2>

        <CarFrame>
          <div className={styles.cabinArea}>{renderFloor(1)}</div>
        </CarFrame>
      </div>

      {/* ===== FLOOR 2 ===== */}
      <div className={styles.floorSection}>
        <h2 className={styles.floorTitle}>TẦNG 2</h2>

        <CarFrame>
          <div className={styles.cabinArea}>{renderFloor(2)}</div>
        </CarFrame>
      </div>
    </div>
  );
}
