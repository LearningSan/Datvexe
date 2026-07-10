"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  useAdminTicketDetail,
  useCancelAdminTicketHold,
  useCheckinAdminTicketSeat,
  useExtendAdminTicketHold,
  useRemoveAdminTicketSeat,
  useSyncAdminTicketTripSeats,
  useUndoCheckinAdminTicketSeat,
  useResendAdminTicketWithResult,
  useAdminTicketOptions,
} from "@/hooks/admin/useTickets";
import type { AdminTicketItem } from "@/types/admin/tickets/ticket-management.type";
import { formatCurrency, formatDateTimeVN } from "@/lib/client/helpers";
import TicketSeatManageModal from "./TicketSeatManageModal";
import TicketChangeModal from "./TicketChangeModal";
import { openAdminTicketPrintWindow } from "@/services/admin/ticket.service";
import styles from "./TicketDetailModal.module.css";

interface Props {
  open: boolean;
  ticket: AdminTicketItem | null;
  onClose: () => void;
}

export default function TicketDetailModal({ open, ticket, onClose }: Props) {
  const [openSeatManage, setOpenSeatManage] = useState(false);
  const [openChangeTicket, setOpenChangeTicket] = useState(false);

  const bookingId = ticket?.bookingId;

  const { data, isLoading } = useAdminTicketDetail(bookingId);
  const extendHold = useExtendAdminTicketHold();
  const cancelHold = useCancelAdminTicketHold();
  const removeSeat = useRemoveAdminTicketSeat();
  const checkinSeat = useCheckinAdminTicketSeat();
  const syncSeats = useSyncAdminTicketTripSeats();
  const resendTicket = useResendAdminTicketWithResult();
  const undoSeatCheckin = useUndoCheckinAdminTicketSeat();
  const { data: options } = useAdminTicketOptions();
  if (!open || !ticket) return null;

  const canManageHold = data?.bookingStatus === "PENDING";

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) onClose();
  };

  const handleExtendHold = () => {
    if (!canManageHold) {
      toast.error("Chỉ vé PENDING mới có thể gia hạn giữ chỗ.");
      return;
    }

    const minutes = Number(prompt("Nhập số phút muốn gia hạn giữ chỗ:", "15"));

    if (!minutes || isNaN(minutes)) {
      if (minutes !== 0) toast.error("Số phút không hợp lệ");
      return;
    }

    extendHold.mutate(
      { bookingId: ticket.bookingId, payload: { minutes } },
      {
        onSuccess: () =>
          toast.success(`Đã gia hạn giữ chỗ thêm ${minutes} phút`),
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const handleCancelHold = () => {
    if (!canManageHold) {
      toast.error("Chỉ vé PENDING mới có thể giải phóng giữ chỗ.");
      return;
    }

    if (
      confirm(
        "Bạn có chắc muốn giải phóng giữ chỗ và trả các ghế về trạng thái trống?",
      )
    ) {
      cancelHold.mutate(ticket.bookingId, {
        onSuccess: () => toast.success("Đã giải phóng giữ chỗ"),
        onError: (e: any) => toast.error(e.message),
      });
    }
  };

  const handlePrint = () => {
    if (data) openAdminTicketPrintWindow(data.bookingId);
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>
              Chi tiết vé:{" "}
              <span className={styles.codeHighlight}>{ticket.bookingCode}</span>
            </h2>
            <p>
              Xem thông tin vé, hành khách, chuyến xe, ghế, giữ chỗ, check-in và
              lịch sử thao tác.
            </p>
          </div>

          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {isLoading || !data ? (
          <div className={styles.loadingWrapper}>
            <span className={styles.spinner}></span>
            <p>Đang tải chi tiết vé...</p>
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.layoutGrid2Col}>
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>1. Thông tin vé</h3>

                <div className={styles.dataGrid}>
                  <div className={styles.dataRow}>
                    <span>Mã vé</span>
                    <strong>{data.bookingCode}</strong>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Loại vé</span>
                    <span className={styles.typeTag}>{data.bookingType}</span>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Trạng thái vé</span>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[data.bookingStatus.toLowerCase()] || ""
                      }`}
                    >
                      {data.bookingStatus}
                    </span>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Tổng tiền vé</span>
                    <strong className={styles.priceText}>
                      {formatCurrency(data.totalAmount)}
                    </strong>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Ngày tạo vé</span>
                    <span>{formatDateTimeVN(data.createdAt)}</span>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Lý do hủy</span>
                    <span className={styles.dangerText}>
                      {data.cancelReason || "—"}
                    </span>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>2. Thông tin hành khách</h3>

                <div className={styles.dataGrid}>
                  <div className={styles.dataRow}>
                    <span>Họ tên</span>
                    <strong>{data.contactName}</strong>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Số điện thoại</span>
                    <strong className={styles.phoneText}>
                      {data.contactPhone}
                    </strong>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Email</span>
                    <span>{data.contactEmail || "—"}</span>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Loại khách</span>
                    <span>{data.customerType || "Vãng lai"}</span>
                  </div>
                </div>
              </section>
            </div>

            <div className={styles.layoutGrid2Col}>
              <section className={styles.section}>
                <div className={styles.sectionHeaderActions}>
                  <h3 className={styles.sectionTitle}>
                    3. Thông tin chuyến xe
                  </h3>

                  <button
                    className={styles.actionLinkBtn}
                    onClick={() => setOpenChangeTicket(true)}
                  >
                    Đổi chuyến hoặc ghế
                  </button>
                </div>

                <div className={styles.dataGrid}>
                  <div className={styles.dataRow}>
                    <span>Tuyến đường</span>
                    <strong>{data.routeName}</strong>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Giờ khởi hành</span>
                    <strong>{formatDateTimeVN(data.departureDatetime)}</strong>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Giờ dự kiến đến</span>
                    <span>{formatDateTimeVN(data.arrivalDatetime)}</span>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Xe</span>
                    <span>{data.vehicleName || "Chưa phân xe"}</span>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Biển số</span>
                    <span>{data.licensePlate || "Chưa có"}</span>
                  </div>

                  <div className={styles.dataRow}>
                    <span>Tài xế</span>
                    <span>{data.driverNames || "Chưa phân tài xế"}</span>
                  </div>
                </div>
              </section>
            </div>

            <section className={styles.section}>
              <div className={styles.sectionHeaderActions}>
                <h3 className={styles.sectionTitle}>5. Danh sách ghế</h3>

                <div className={styles.inlineActionGroup}>
                  <button
                    className={styles.secondaryBtn}
                    onClick={() => setOpenSeatManage(true)}
                  >
                    Quản lý ghế
                  </button>

                  <button
                    className={styles.secondaryBtn}
                    onClick={() =>
                      syncSeats.mutate(ticket.bookingId, {
                        onSuccess: () =>
                          toast.success("Đã đồng bộ trạng thái ghế"),
                        onError: (e: any) => toast.error(e.message),
                      })
                    }
                  >
                    Đồng bộ ghế
                  </button>
                </div>
              </div>

              <div className={styles.seatTableWrapper}>
                <table className={styles.innerTable}>
                  <thead>
                    <tr>
                      <th>Số ghế</th>
                      <th>Vị trí</th>
                      <th>Giá vé</th>
                      <th>Trạng thái check-in</th>
                      <th className={styles.textRight}>Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.seats.map((seat) => (
                      <tr key={seat.bookingSeatId}>
                        <td>
                          <strong className={styles.seatLabel}>
                            {seat.seatNumber}
                          </strong>
                        </td>

                        <td>
                          Tầng {seat.floorNo} · Hàng {seat.rowNo} · Cột{" "}
                          {seat.columnNo}
                        </td>

                        <td>
                          <strong className={styles.currencyMini}>
                            {formatCurrency(seat.seatPrice)}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`${styles.checkinBadge} ${
                              seat.checkinStatus === "CHECKED_IN"
                                ? styles.checked
                                : styles.unchecked
                            }`}
                          >
                            {seat.checkinStatus === "CHECKED_IN"
                              ? "Đã check-in"
                              : "Chưa check-in"}
                          </span>
                        </td>

                        <td className={styles.textRight}>
                          <div className={styles.tableRowActions}>
                            {seat.checkinStatus !== "CHECKED_IN" ? (
                              <button
                                className={styles.inlineActionCheckin}
                                onClick={() =>
                                  checkinSeat.mutate(
                                    {
                                      bookingId: ticket.bookingId,
                                      bookingSeatId: seat.bookingSeatId,
                                    },
                                    {
                                      onSuccess: () =>
                                        toast.success(
                                          `Đã check-in ghế ${seat.seatNumber}`,
                                        ),
                                      onError: (e: any) =>
                                        toast.error(e.message),
                                    },
                                  )
                                }
                              >
                                Check-in
                              </button>
                            ) : (
                              <button
                                className={styles.inlineActionUndo}
                                onClick={() =>
                                  undoSeatCheckin.mutate(
                                    {
                                      bookingId: ticket.bookingId,
                                      bookingSeatId: seat.bookingSeatId,
                                    },
                                    {
                                      onSuccess: () =>
                                        toast.success(
                                          `Đã hủy check-in ghế ${seat.seatNumber}`,
                                        ),
                                      onError: (e: any) =>
                                        toast.error(e.message),
                                    },
                                  )
                                }
                              >
                                Hủy check-in
                              </button>
                            )}

                            <button
                              className={styles.inlineActionRemove}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Bạn có chắc muốn thu hồi ghế ${seat.seatNumber} khỏi vé này?`,
                                  )
                                ) {
                                  removeSeat.mutate(
                                    {
                                      bookingId: ticket.bookingId,
                                      bookingSeatId: seat.bookingSeatId,
                                    },
                                    {
                                      onSuccess: () =>
                                        toast.success("Đã thu hồi ghế"),
                                      onError: (e: any) =>
                                        toast.error(e.message),
                                    },
                                  );
                                }
                              }}
                            >
                              Thu hồi ghế
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {data.seats.length === 0 && (
                      <tr>
                        <td colSpan={5} className={styles.emptyTableText}>
                          Vé này chưa có ghế.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeaderActions}>
                <h3 className={styles.sectionTitle}>6. Giữ chỗ</h3>

                <div className={styles.inlineActionGroup}>
                  <button
                    className={styles.actionLinkBtn}
                    onClick={handleExtendHold}
                    disabled={!canManageHold}
                  >
                    Gia hạn giữ chỗ
                  </button>

                  <button
                    className={`${styles.actionLinkBtn} ${styles.dangerLink}`}
                    onClick={handleCancelHold}
                    disabled={!canManageHold}
                  >
                    Giải phóng giữ chỗ
                  </button>
                </div>
              </div>

              <div className={styles.holdOverviewGrid}>
                <p>
                  <span>Trạng thái giữ chỗ:</span>{" "}
                  <strong className={styles.statusLabelText}>
                    {data.holdStatus}
                  </strong>
                </p>

                <p>
                  <span>Hết hạn lúc:</span>{" "}
                  <strong>
                    {data.holdExpiredAt
                      ? formatDateTimeVN(data.holdExpiredAt)
                      : "Không có giữ chỗ"}
                  </strong>
                </p>
              </div>

              {data.holds.length > 0 && (
                <div className={styles.holdTicketBadgeContainer}>
                  {data.holds.map((hold) => (
                    <div
                      key={hold.seatHoldId}
                      className={`${styles.holdDetailCard} ${
                        hold.isExpired ? styles.holdExpired : ""
                      }`}
                    >
                      <strong>Ghế {hold.seatNumber}</strong>
                      <span>
                        {hold.isExpired
                          ? "Đã hết hạn"
                          : `Còn ${hold.remainingSeconds} giây`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>7. Lịch sử thao tác</h3>

              <div className={styles.auditTimeline}>
                {data.histories.map((h) => (
                  <div key={h.historyId} className={styles.timelineItem}>
                    <div className={styles.timelineMeta}>
                      <span className={styles.actionTypeTag}>
                        {h.actionType}
                      </span>

                      <span className={styles.actorName}>
                        Người thao tác: <b>{h.performedByName || "Hệ thống"}</b>
                      </span>

                      <small className={styles.timelineTime}>
                        {formatDateTimeVN(h.createdAt)}
                      </small>
                    </div>

                    {h.reason && (
                      <p className={styles.actionReasonText}>
                        Lý do: <em>{h.reason}</em>
                      </p>
                    )}
                  </div>
                ))}

                {data.histories.length === 0 && (
                  <div className={styles.emptyPromptBlock}>
                    Chưa có lịch sử thao tác.
                  </div>
                )}
              </div>
            </section>

            <section className={`${styles.section} ${styles.actionFooterBox}`}>
              <div>
                <h3 className={styles.sectionTitle}>8. Tiện ích</h3>
                <p className={styles.sectionSubtitleText}>
                  In vé hoặc gửi lại thông tin vé cho khách hàng.
                </p>
              </div>

              <div className={styles.footerActionRow}>
                <button className={styles.printActionBtn} onClick={handlePrint}>
                  🖨️ In vé
                </button>

                <button
                  className={styles.resendActionBtn}
                  onClick={() =>
                    resendTicket.mutate(ticket.bookingId, {
                      onSuccess: () => toast.success("Đã gửi lại vé"),
                      onError: (e: any) => toast.error(e.message),
                    })
                  }
                >
                  ✉️ Gửi lại vé
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      <TicketSeatManageModal
        open={openSeatManage}
        detail={data ?? null}
        onClose={() => setOpenSeatManage(false)}
      />

      <TicketChangeModal
        open={openChangeTicket}
        detail={data ?? null}
        options={options}
        onClose={() => setOpenChangeTicket(false)}
      />
    </div>
  );
}
