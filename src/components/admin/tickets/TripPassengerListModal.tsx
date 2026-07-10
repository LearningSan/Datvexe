"use client";

import { useAdminTripPassengerList, useAdminTripSeatList } from "@/hooks/admin/useTickets";
import styles from "./TicketActionModal.module.css";

interface Props {
  open: boolean;
  tripId: number | null;
  onClose: () => void;
}

export default function TripPassengerListModal({ open, tripId, onClose }: Props) {
  const passengers = useAdminTripPassengerList(tripId);
  const seats = useAdminTripSeatList(tripId);

  if (!open || !tripId) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.largeModal}>
        <div className={styles.header}>
          <h2>Danh sách hành khách / ghế chuyến #{tripId}</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.panel}>
            <h3>Hành khách</h3>
            {(passengers.data ?? []).map((p) => (
              <p key={p.bookingId}>
                <strong>{p.bookingCode}</strong> · {p.passengerName} · {p.passengerPhone} · Ghế {p.seatNumbers || "chưa có"}
              </p>
            ))}
          </div>

          <div className={styles.panel}>
            <h3>Ghế</h3>
            {(seats.data ?? []).map((s) => (
              <p key={s.seatLayoutDetailId}>
                <strong>{s.seatNumber}</strong> · {s.seatStatus}
                {s.bookingCode ? ` · ${s.bookingCode} · ${s.passengerName}` : ""}
              </p>
            ))}
          </div>

          <div className={styles.actions}>
            <button onClick={() => window.print()}>In danh sách</button>
            <button onClick={onClose}>Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
}
