"use client";
import { useMemo, Fragment } from "react";

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

export default function CabinVip22({
  seats,

  selectedSeats,

  onSelectSeat,
}: Props) {
  const floors = useMemo(() => {
    const floorNumbers = [...new Set(seats.map((s) => s.floorNo))];

    return floorNumbers.map((floorNo) => {
      const floorSeats = seats
        .filter((seat) => seat.floorNo === floorNo)
        .sort((a, b) => b.columnNo - a.columnNo);

      return {
        floorNo,

        filterSeat: (rowNo: number) => {
          return floorSeats.filter((seat) => seat.rowNo == rowNo);
        },
      };
    });
  }, [seats]);

  const isSelected = (id: number) => selectedSeats.some((s) => s.seatId === id);

  const renderSeat = (seat: Seat) => (
    <SeatItem
      key={seat.seatId}
      seat={seat}
      selected={isSelected(seat.seatId)}
      onSelect={onSelectSeat}
    />
  );

  return (
    <div className={styles.cabinContainer}>
      {floors.map((floor) => (
        <div className={styles.floorSection} key={floor.floorNo}>
          <h2 className={styles.floorTitle}>TẦNG{floor.floorNo}</h2>
          <CarFrame>
            <div className={styles.cabinArea}>
              <div className={styles.seatsRowGroup}>
                {floor.filterSeat(1).map((seat) => renderSeat(seat))}
              </div>
              <div className={styles.aisleLane}>
                <span>LỐI ĐI CHUNG</span>
              </div>
              <div className={styles.seatsRowGroup}>
                {floor.filterSeat(2).map((seat, index) => (
                  <Fragment key={seat.seatId}>
                    {index === 0 && <div className={styles.wcItem}>WC</div>}

                    {renderSeat(seat)}
                  </Fragment>
                ))}
              </div>
            </div>
          </CarFrame>
        </div>
      ))}
    </div>
  );
}
