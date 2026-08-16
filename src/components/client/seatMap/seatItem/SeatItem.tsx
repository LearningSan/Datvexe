"use client";

import styles from "./SeatItem.module.css";

import { Seat } from "@/types/client/seat/seat.type";

interface Props {
  seat: Seat;

  selected: boolean;

  onSelect: (seat: Seat) => void;
}

export default function SeatItem({ seat, selected, onSelect }: Props) {
  const isHeldByMe = Boolean(seat.isHeldByMe);

  const getStatusClass = () => {
    if (selected) {
      return styles.selected;
    }

    if (isHeldByMe) {
      return styles.selected;
    }

    switch (seat.status) {
      case "BOOKED":
        return styles.booked;

      case "HOLDING":
        return styles.holding;

      default:
        return styles.available;
    }
  };

  return (
    <button
      disabled={seat.status !== "AVAILABLE" && !isHeldByMe}
      onClick={() => onSelect(seat)}
      className={`${styles.seatItem} ${getStatusClass()}`}
    >
      {seat.seatNumber}
    </button>
  );
}
