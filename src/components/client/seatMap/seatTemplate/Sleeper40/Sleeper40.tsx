"use client";

import { useMemo } from "react";
import styles from "./Sleeper40.module.css";
import CarFrame from "../../carPart/frame/CarFrame";
import SeatItem from "../../seatItem/SeatItem";
import { Seat } from "@/types/client/seat/seat.type";
import { BookingSeat } from "@/types/client/booking/booking-seat.type";

interface Props {
  seats: Seat[];
  selectedSeats: BookingSeat[];
  onSelectSeat: (seat: Seat) => void;
}

export default function Sleeper40Seat({
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

  return (
    <div className={styles.busContainer}>
      {floors.map((floor) => (
        <div key={floor.floorNo} className={styles.floorSection}>
          <h2 className={styles.floorTitle}>TẦNG {floor.floorNo}</h2>

          <CarFrame>
            <div className={styles.responsiveWrapper}>
              <div className={styles.busInner}>
                <div className={styles.cabinArea}>
                  <div className={styles.seatsRow}>
                    {floor.filterSeat(1).map((seat) => (
                      <SeatItem
                        key={seat.seatId}
                        seat={seat}
                        selected={isSelected(seat.seatId)}
                        onSelect={onSelectSeat}
                      />
                    ))}
                  </div>

                  <div className={styles.aisleLane}>
                    <span>LỐI ĐI CHUNG</span>
                  </div>

                  <div className={`${styles.seatsRow} ${styles.middleRow}`}>
                    {floor.filterSeat(2).map((seat) => (
                      <SeatItem
                        key={seat.seatId}
                        seat={seat}
                        selected={isSelected(seat.seatId)}
                        onSelect={onSelectSeat}
                      />
                    ))}
                  </div>

                  <div className={styles.aisleLane}>
                    <span>LỐI ĐI CHUNG</span>
                  </div>

                  <div className={styles.seatsRow}>
                    {floor.filterSeat(3).map((seat) => (
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
            </div>
          </CarFrame>
        </div>
      ))}
    </div>
  );
}
