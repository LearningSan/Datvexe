"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  useAddAdminTicketSeats,
  useAdminTicketAvailableSeats,
  useChangeAdminTicketSeats,
  useRemoveAdminTicketSeat,
  useSyncAdminTicketTripSeats,
} from "@/hooks/admin/useTickets";
import type { AdminTicketDetail } from "@/types/admin/tickets/ticket-management.type";
import styles from "./TicketActionModal.module.css";

interface Props {
  open: boolean;
  detail: AdminTicketDetail | null;
  onClose: () => void;
}

export default function TicketSeatManageModal({ open, detail, onClose }: Props) {
  const [selectedAddSeatIds, setSelectedAddSeatIds] = useState<number[]>([]);
  const [selectedOldBookingSeatIds, setSelectedOldBookingSeatIds] = useState<number[]>([]);
  const [selectedNewSeatIds, setSelectedNewSeatIds] = useState<number[]>([]);

  const availableSeats = useAdminTicketAvailableSeats(detail?.bookingId);
  const addSeats = useAddAdminTicketSeats();
  const changeSeats = useChangeAdminTicketSeats();
  const removeSeat = useRemoveAdminTicketSeat();
  const syncSeats = useSyncAdminTicketTripSeats();

  useEffect(() => {
    if (open) {
      setSelectedAddSeatIds([]);
      setSelectedOldBookingSeatIds([]);
      setSelectedNewSeatIds([]);
    }
  }, [open]);

  if (!open || !detail) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const toggle = (list: number[], value: number) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const seatNameById = (id: number) =>
    availableSeats.data?.find((seat) => seat.seatLayoutDetailId === id)?.seatNumber || `#${id}`;

  const canChange = selectedOldBookingSeatIds.length > 0 &&
    selectedOldBookingSeatIds.length === selectedNewSeatIds.length;

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.largeModal}>
        <div className={styles.header}>
          <h2>Quản lý ghế của vé {detail.bookingCode}</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.panel}>
            <h3>Ghế hiện tại của booking</h3>
            <div className={styles.currentSeats}>
              {detail.seats.map((seat) => {
                const selected = selectedOldBookingSeatIds.includes(seat.bookingSeatId);
                return (
                  <button
                    key={seat.bookingSeatId}
                    className={`${styles.seatButton} ${selected ? styles.seatSelected : ""}`}
                    onClick={() => setSelectedOldBookingSeatIds((current) => toggle(current, seat.bookingSeatId))}
                    type="button"
                  >
                    {seat.seatNumber}
                    <small>Tầng {seat.floorNo}</small>
                    <small>{seat.checkinStatus}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.twoCols}>
            <div className={styles.panel}>
              <h3>Thêm ghế bằng tên ghế</h3>
              <p>Chọn trực tiếp trên sơ đồ, không cần nhớ ID.</p>

              <div className={styles.seatMap}>
                {(availableSeats.data ?? []).map((seat) => {
                  const disabled = seat.seatStatus !== "AVAILABLE";
                  const selected = selectedAddSeatIds.includes(seat.seatLayoutDetailId);
                  return (
                    <button
                      key={seat.seatLayoutDetailId}
                      disabled={disabled}
                      className={`${styles.seatButton} ${selected ? styles.seatSelected : ""} ${disabled ? styles.seatDisabled : ""} ${seat.seatStatus === "BOOKED" ? styles.seatBooked : ""} ${seat.seatStatus === "HOLDING" ? styles.seatHolding : ""}`}
                      onClick={() => setSelectedAddSeatIds((current) => toggle(current, seat.seatLayoutDetailId))}
                      type="button"
                    >
                      {seat.seatNumber}
                      <small>T{seat.floorNo} · H{seat.rowNo}-C{seat.columnNo}</small>
                      <small>{seat.seatStatus}</small>
                    </button>
                  );
                })}
              </div>

              <p className={styles.selectedSummary}>
                Đang chọn thêm: {selectedAddSeatIds.map(seatNameById).join(", ") || "Chưa chọn"}
              </p>

              <button
                disabled={selectedAddSeatIds.length === 0}
                onClick={() => addSeats.mutate(
                  { bookingId: detail.bookingId, payload: { seatLayoutDetailIds: selectedAddSeatIds } },
                  { onSuccess: () => { toast.success("Đã thêm ghế"); setSelectedAddSeatIds([]); }, onError: (e: any) => toast.error(e.message) },
                )}
              >
                Thêm ghế đã chọn
              </button>
            </div>

            <div className={styles.panel}>
              <h3>Đổi ghế bằng sơ đồ ghế</h3>
              <p>Chọn ghế cũ ở khung bên trên, sau đó chọn số ghế mới tương ứng.</p>

              <div className={styles.seatMap}>
                {(availableSeats.data ?? []).map((seat) => {
                  const disabled = seat.seatStatus !== "AVAILABLE";
                  const selected = selectedNewSeatIds.includes(seat.seatLayoutDetailId);
                  return (
                    <button
                      key={seat.seatLayoutDetailId}
                      disabled={disabled}
                      className={`${styles.seatButton} ${selected ? styles.seatSelected : ""} ${disabled ? styles.seatDisabled : ""} ${seat.seatStatus === "BOOKED" ? styles.seatBooked : ""} ${seat.seatStatus === "HOLDING" ? styles.seatHolding : ""}`}
                      onClick={() => setSelectedNewSeatIds((current) => toggle(current, seat.seatLayoutDetailId))}
                      type="button"
                    >
                      {seat.seatNumber}
                      <small>T{seat.floorNo} · H{seat.rowNo}-C{seat.columnNo}</small>
                      <small>{seat.seatStatus}</small>
                    </button>
                  );
                })}
              </div>

              <p className={styles.selectedSummary}>
                Ghế mới đã chọn: {selectedNewSeatIds.map(seatNameById).join(", ") || "Chưa chọn"}
              </p>

              <button
                disabled={!canChange}
                onClick={() => changeSeats.mutate(
                  { bookingId: detail.bookingId, payload: { oldBookingSeatIds: selectedOldBookingSeatIds, newSeatLayoutDetailIds: selectedNewSeatIds } },
                  { onSuccess: () => { toast.success("Đã đổi ghế"); setSelectedOldBookingSeatIds([]); setSelectedNewSeatIds([]); }, onError: (e: any) => toast.error(e.message) },
                )}
              >
                Đổi sang ghế đã chọn
              </button>
            </div>
          </div>

          <div className={styles.panel}>
            <h3>Gỡ ghế khỏi booking</h3>
            <div className={styles.currentSeats}>
              {detail.seats.map((seat) => (
                <div key={seat.bookingSeatId} className={styles.seatCard}>
                  <strong>{seat.seatNumber}</strong>
                  <span>Tầng {seat.floorNo}</span>
                  <span>{seat.checkinStatus}</span>
                  <button
                    onClick={() => {
                      if (!confirm(`Gỡ ghế ${seat.seatNumber} khỏi booking?`)) return;
                      removeSeat.mutate(
                        { bookingId: detail.bookingId, bookingSeatId: seat.bookingSeatId },
                        { onSuccess: () => toast.success("Đã gỡ ghế"), onError: (e: any) => toast.error(e.message) },
                      );
                    }}
                  >
                    Gỡ ghế {seat.seatNumber}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button onClick={onClose}>Đóng</button>
            <button onClick={() => syncSeats.mutate(detail.bookingId, { onSuccess: () => toast.success("Đã đồng bộ số ghế trống") })}>
              Đồng bộ số ghế trống của chuyến
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
