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
    // 1. Chuẩn hóa dữ liệu: Đảo ngược rowNo và columnNo lại để map chuẩn với giao diện cũ
    const normalizedSeats = seats.map((seat) => ({
      ...seat,
      // Hoán đổi vị trí row và column để đồng bộ với cấu trúc Grid 3 dãy của Frontend
      rowNo: seat.columnNo,
      columnNo: seat.rowNo,
    }));

    const floorNumbers = [...new Set(normalizedSeats.map((s) => s.floorNo))];

    return floorNumbers.map((floorNo) => {
      // 2. Lọc ghế theo tầng và sắp xếp theo thứ tự hiển thị từ đầu xe đến đuôi xe
      const floorSeats = normalizedSeats
        .filter((seat) => seat.floorNo === floorNo)
        .sort((a, b) => {
          if (a.columnNo !== b.columnNo) {
            return a.columnNo - b.columnNo;
          }
          return a.rowNo - b.rowNo;
        });

      return {
        floorNo,
        leftSeats: floorSeats.filter((s) => s.columnNo === 1),
        middleSeats: floorSeats.filter((s) => s.columnNo === 2),
        rightSeats: floorSeats.filter((s) => s.columnNo === 3),
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
                  {/* DÃY TRÁI (Column 1) */}
                  <div className={styles.seatsRow}>
                    {floor.leftSeats.map((seat) => (
                      <SeatItem
                        key={seat.seatId}
                        seat={seat}
                        selected={isSelected(seat.seatId)}
                        onSelect={onSelectSeat}
                      />
                    ))}
                  </div>

                  {/* LỐI ĐI 1 */}
                  <div className={styles.aisleLane}>
                    <span>LỐI ĐI</span>
                  </div>

                  {/* DÃY GIỮA (Column 2) */}
                  <div className={`${styles.seatsRow} ${styles.middleRow}`}>
                    {floor.middleSeats.map((seat) => (
                      <SeatItem
                        key={seat.seatId}
                        seat={seat}
                        selected={isSelected(seat.seatId)}
                        onSelect={onSelectSeat}
                      />
                    ))}
                  </div>

                  {/* LỐI ĐI 2 */}
                  <div className={styles.aisleLane}>
                    <span>LỐI ĐI</span>
                  </div>

                  {/* DÃY PHẢI (Column 3) */}
                  <div className={styles.seatsRow}>
                    {floor.rightSeats.map((seat) => (
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
