"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  useAddAdminTicketSeats,
  useAdminTicketAvailableSeats,
  useChangeAdminTicketSeats,
  useRemoveAdminTicketSeat,
} from "@/hooks/admin/useTickets";

import type { AdminTicketDetail } from "@/types/admin/tickets/ticket-management.type";
import SeatMap from "@/components/admin/AdminSeatMap";
import styles from "./TicketSeatManageModal.module.css";

interface Props {
  open: boolean;
  detail: AdminTicketDetail | null;
  onClose: () => void;
}

type SeatAction = "CHANGE" | "ADD" | null;

export default function TicketSeatManageModal({
  open,
  detail,
  onClose,
}: Props) {
  const [action, setAction] = useState<SeatAction>(null);
  const [selectedOldBookingSeatIds, setSelectedOldBookingSeatIds] = useState<
    number[]
  >([]);
  const [selectedNewSeatIds, setSelectedNewSeatIds] = useState<number[]>([]);
  const [selectedAddSeatIds, setSelectedAddSeatIds] = useState<number[]>([]);
  const [seatToRemove, setSeatToRemove] = useState<{
    id: number;
    number: string;
  } | null>(null);

  const availableSeats = useAdminTicketAvailableSeats(detail?.bookingId);
  const addSeats = useAddAdminTicketSeats();
  const changeSeats = useChangeAdminTicketSeats();
  const removeSeat = useRemoveAdminTicketSeat();

  useEffect(() => {
    if (!open) return;
    setAction(null);
    setSelectedOldBookingSeatIds([]);
    setSelectedNewSeatIds([]);
    setSelectedAddSeatIds([]);
    setSeatToRemove(null);
  }, [open, detail?.bookingId]);

  const seats = availableSeats.data ?? [];

  const currentBookingSeats = useMemo(
    () => seats.filter((seat) => seat.isCurrentBooking),
    [seats],
  );

  const getSeatName = (seatLayoutDetailId: number) =>
    seats.find((seat) => seat.seatLayoutDetailId === seatLayoutDetailId)
      ?.seatNumber ?? `#${seatLayoutDetailId}`;

  const getSeatStatusClass = (seat: (typeof seats)[number]) => {
    if (seat.isCurrentBooking) {
      return styles.seatCurrentBooking;
    }

    switch (seat.seatStatus) {
      case "AVAILABLE":
        return styles.seatAvailable;

      case "BOOKED":
        return styles.seatBooked;

      case "HOLDING":
        return styles.seatHeld;

      default:
        return styles.seatDisabled;
    }
  };

  const toggleSeat = (current: number[], seatId: number, max?: number) => {
    if (current.includes(seatId)) {
      return current.filter((id) => id !== seatId);
    }
    if (max !== undefined && current.length >= max) {
      return current;
    }
    return [...current, seatId];
  };

  const canChange =
    selectedOldBookingSeatIds.length > 0 &&
    selectedOldBookingSeatIds.length === selectedNewSeatIds.length;

  const handleClose = () => {
    if (addSeats.isPending || changeSeats.isPending || removeSeat.isPending) {
      return;
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleSelectAction = (nextAction: SeatAction) => {
    setAction(nextAction);
    setSelectedOldBookingSeatIds([]);
    setSelectedNewSeatIds([]);
    setSelectedAddSeatIds([]);
  };

  const handleChangeOldSeat = (bookingSeatId: number) => {
    setSelectedOldBookingSeatIds((current) =>
      toggleSeat(current, bookingSeatId),
    );
    setSelectedNewSeatIds([]);
  };

  const handleSelectNewSeat = (seatLayoutDetailId: number) => {
    if (selectedOldBookingSeatIds.length === 0) {
      toast.error("Hãy chọn ghế cần đổi ở cột bên trái trước");
      return;
    }
    const max = selectedOldBookingSeatIds.length;
    setSelectedNewSeatIds((current) =>
      toggleSeat(current, seatLayoutDetailId, max),
    );
  };

  const handleSelectAddSeat = (seatLayoutDetailId: number) => {
    setSelectedAddSeatIds((current) => toggleSeat(current, seatLayoutDetailId));
  };

  const handleAddSeats = () => {
    if (!detail) return;
    if (selectedAddSeatIds.length === 0) {
      toast.error("Chưa chọn ghế để thêm");
      return;
    }

    addSeats.mutate(
      {
        bookingId: detail.bookingId,
        payload: { seatLayoutDetailIds: selectedAddSeatIds },
      },
      {
        onSuccess: () => {
          toast.success("Đã thêm ghế vào vé");
          setSelectedAddSeatIds([]);
          setAction(null);
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Không thể thêm ghế");
        },
      },
    );
  };

  const handleChangeSeats = () => {
    if (!detail) return;
    if (!canChange) {
      toast.error("Số ghế cũ và ghế mới phải tương ứng");
      return;
    }

    changeSeats.mutate(
      {
        bookingId: detail.bookingId,
        payload: {
          oldBookingSeatIds: selectedOldBookingSeatIds,
          newSeatLayoutDetailIds: selectedNewSeatIds,
        },
      },
      {
        onSuccess: () => {
          toast.success("Đã đổi ghế");
          setSelectedOldBookingSeatIds([]);
          setSelectedNewSeatIds([]);
          setAction(null);
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Không thể đổi ghế");
        },
      },
    );
  };

  const handleConfirmRemoveSeat = () => {
    if (!detail || !seatToRemove) return;

    removeSeat.mutate(
      {
        bookingId: detail.bookingId,
        bookingSeatId: seatToRemove.id,
      },
      {
        onSuccess: () => {
          toast.success(`Đã gỡ ghế ${seatToRemove.number}`);
          setSeatToRemove(null);
        },
        onError: (error: any) => {
          toast.error(error?.message ?? "Không thể gỡ ghế");
        },
      },
    );
  };

  if (!open || !detail) return null;

  return (
    <div className={styles.overlay} onMouseDown={handleBackdropClick}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className={styles.header}>
          <div>
            <h2>Quản lý ghế</h2>
            <p>
              Vé <strong>{detail.bookingCode}</strong>
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {/* BODY - SPLIT VIEW (2 CỘT) */}
        <div className={styles.bodyGrid}>
          {/* CỘT TRÁI: Summary & Chọn hành động */}
          <div className={styles.leftColumn}>
            {/* Summary */}
            <div className={styles.summary}>
              <div>
                <span>Khách hàng:</span>
                <strong>{detail.contactName}</strong>
              </div>
              <div>
                <span>Chuyến:</span>
                <strong>
                  {detail.originCityName} → {detail.destinationCityName}
                </strong>
              </div>
              <div>
                <span>Số ghế hiện tại:</span>
                <strong>{currentBookingSeats.length} ghế</strong>
              </div>
              <div>
                <span>Trạng thái:</span>
                <strong>{detail.bookingStatus}</strong>
              </div>
            </div>

            {/* Menu Chọn Action */}
            <section className={styles.actionChooser}>
              <h4>Thao tác</h4>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  className={`${styles.actionCard} ${action === "CHANGE" ? styles.active : ""}`}
                  onClick={() =>
                    handleSelectAction(action === "CHANGE" ? null : "CHANGE")
                  }
                >
                  <strong>Đổi ghế</strong>
                </button>
                <button
                  type="button"
                  className={`${styles.actionCard} ${action === "ADD" ? styles.active : ""}`}
                  onClick={() =>
                    handleSelectAction(action === "ADD" ? null : "ADD")
                  }
                >
                  <strong>Thêm ghế</strong>
                </button>
              </div>
            </section>

            {/* Danh sách ghế hiện tại */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Ghế hiện tại</h3>
              </div>
              <div className={styles.currentSeats}>
                {currentBookingSeats.map((seat) => {
                  const bookingSeatId = seat.bookingSeatId;
                  if (bookingSeatId == null) return null;

                  const selected =
                    selectedOldBookingSeatIds.includes(bookingSeatId);

                  return (
                    <div key={bookingSeatId} className={styles.seatRowItem}>
                      <button
                        type="button"
                        className={`${styles.currentSeat} ${selected ? styles.currentSeatSelected : ""}`}
                        onClick={() => {
                          if (action === "CHANGE") {
                            handleChangeOldSeat(bookingSeatId);
                          }
                        }}
                      >
                        <strong>{seat.seatNumber}</strong>
                        <small>T{seat.floorNo}</small>
                      </button>

                      <button
                        type="button"
                        className={styles.dangerButton}
                        disabled={removeSeat.isPending}
                        onClick={() =>
                          setSeatToRemove({
                            id: bookingSeatId,
                            number: seat.seatNumber,
                          })
                        }
                      >
                        Gỡ
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* CỘT PHẢI: Workspace sơ đồ ghế chính */}
          <div className={styles.rightColumn}>
            {action === null && (
              <div className={styles.placeholderState}>
                <p>
                  👈 Chọn <strong>Đổi ghế</strong> hoặc{" "}
                  <strong>Thêm ghế</strong> từ cột bên trái để bắt đầu thao tác.
                </p>
              </div>
            )}

            {/* ACTION: CHANGE (ĐỔI GHẾ) */}
            {action === "CHANGE" && (
              <section className={styles.actionPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h3>Đổi ghế</h3>
                    <p>
                      1. Bấm chọn ghế cần đổi ở cột bên trái
                      <br />
                      2. Chọn ghế trống tương ứng ở sơ đồ bên dưới
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => handleSelectAction(null)}
                  >
                    Hủy
                  </button>
                </div>

                <div className={styles.changeInfo}>
                  <div>
                    <span>Ghế đổi:</span>
                    <strong>
                      {selectedOldBookingSeatIds.length
                        ? selectedOldBookingSeatIds
                            .map(
                              (id) =>
                                detail.seats.find(
                                  (item) => item.bookingSeatId === id,
                                )?.seatNumber ?? `#${id}`,
                            )
                            .join(", ")
                        : "Chưa chọn (ở cột trái)"}
                    </strong>
                  </div>
                  <div>
                    <span>Ghế mới:</span>
                    <strong>
                      {selectedNewSeatIds.length
                        ? selectedNewSeatIds.map(getSeatName).join(", ")
                        : "Chưa chọn"}
                    </strong>
                  </div>
                </div>

                <div className={styles.seatMapHeader}>
                  <strong>Sơ đồ chuyến xe</strong>
                  <span>
                    {selectedNewSeatIds.length} /{" "}
                    {selectedOldBookingSeatIds.length} đã chọn
                  </span>
                </div>

                {/* Seat Map GRID cho ĐỔI GHẾ */}
                <div className={styles.seatMapContainer}>
                  <div className={styles.seatMapScaler}>
                    <SeatMap
                      seats={seats}
                      layoutName={detail.seatLayoutName}
                      mode="CHANGE"
                      selectedSeatIds={selectedNewSeatIds}
                      selectedOldBookingSeatIds={selectedOldBookingSeatIds}
                      onSelectSeat={handleSelectNewSeat}
                    />
                  </div>
                </div>
                <div className={styles.footerAction}>
                  <button
                    type="button"
                    disabled={!canChange || changeSeats.isPending}
                    onClick={handleChangeSeats}
                    className={styles.primaryButton}
                  >
                    {changeSeats.isPending
                      ? "Đang xử lý..."
                      : `Xác nhận đổi ${selectedOldBookingSeatIds.length} ghế`}
                  </button>
                </div>
              </section>
            )}

            {/* ACTION: ADD (THÊM GHẾ) */}
            {action === "ADD" && (
              <section className={styles.actionPanel}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h3>Thêm ghế trống vào vé</h3>
                    <p>Chọn các ghế trống bên dưới để thêm vào vé hiện tại.</p>
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => handleSelectAction(null)}
                  >
                    Hủy
                  </button>
                </div>

                {/* Seat Map GRID cho THÊM GHẾ */}
                <div className={styles.seatMapContainer}>
                  <div className={styles.seatMapScaler}>
                    <SeatMap
                      seats={seats}
                      layoutName={detail.seatLayoutName}
                      mode="ADD"
                      selectedSeatIds={selectedAddSeatIds}
                      selectedOldBookingSeatIds={[]}
                      onSelectSeat={handleSelectAddSeat}
                    />
                  </div>
                </div>

                <div className={styles.selectionBar}>
                  <div>
                    <span>Sẽ thêm: </span>
                    <strong>
                      {selectedAddSeatIds.length
                        ? selectedAddSeatIds.map(getSeatName).join(", ")
                        : "Chưa chọn"}
                    </strong>
                  </div>
                  <button
                    type="button"
                    disabled={
                      selectedAddSeatIds.length === 0 || addSeats.isPending
                    }
                    onClick={handleAddSeats}
                    className={styles.primaryButton}
                  >
                    {addSeats.isPending
                      ? "Đang thêm..."
                      : `Thêm ${selectedAddSeatIds.length} ghế`}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Modal xác nhận gỡ ghế */}
        {seatToRemove && (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmBox}>
              <h4>Xác nhận gỡ ghế</h4>
              <p>
                Gỡ ghế <strong>{seatToRemove.number}</strong> khỏi vé{" "}
                <strong>{detail.bookingCode}</strong>?
              </p>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={removeSeat.isPending}
                  onClick={() => setSeatToRemove(null)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className={styles.dangerPrimaryButton}
                  disabled={removeSeat.isPending}
                  onClick={handleConfirmRemoveSeat}
                >
                  {removeSeat.isPending ? "Đang gỡ..." : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
