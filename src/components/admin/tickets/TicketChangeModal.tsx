"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useChangeAdminTicketPreview,
  useChangeAdminTicketTrip,
} from "@/hooks/admin/useTickets";
import type {
  AdminTicketDetail,
  AdminTicketOptionsResponse,
} from "@/types/admin/tickets/ticket-management.type";
import { formatCurrency } from "@/lib/client/helpers";
import styles from "./TicketChangeModal.module.css";

interface Props {
  open: boolean;
  detail: AdminTicketDetail | null;
  options?: AdminTicketOptionsResponse;
  onClose: () => void;
}

interface StopPointOption {
  pickupPointId: number;
  pointName: string;
  address: string | null;
  stopType?: "PICKUP" | "DROP_OFF" | "BOTH";
  stopOrder?: number;
  arrivalTime?: string | null;
  departureTime?: string | null;
}

type ChangeSeatStatus = "AVAILABLE" | "BOOKED" | "HOLDING" | "CURRENT_BOOKING";

interface ChangeSeatOption {
  seatLayoutDetailId: number;
  seatNumber: string;
  floorNo: number;
  rowNo: number;
  columnNo: number;
  seatStatus: ChangeSeatStatus;
  bookingSeatId?: number | null;
  ownerBookingId?: number | null;
  isCurrentBookingSeat?: boolean;
  wasOriginalSeat?: boolean;
}

export default function TicketChangeModal({
  open,
  detail,
  options,
  onClose,
}: Props) {
  const [targetDate, setTargetDate] = useState("");
  const [tripSearch, setTripSearch] = useState("");
  const [newTripId, setNewTripId] = useState("");

  const [selectedOldBookingSeatIds, setSelectedOldBookingSeatIds] = useState<
    number[]
  >([]);
  const [selectedNewSeatIds, setSelectedNewSeatIds] = useState<number[]>([]);

  const [pickupPointId, setPickupPointId] = useState("");
  const [dropoffPointId, setDropoffPointId] = useState("");
  const [pickupSearch, setPickupSearch] = useState("");
  const [dropoffSearch, setDropoffSearch] = useState("");

  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open && detail) {
      setTargetDate("");
      setTripSearch("");
      setNewTripId(String(detail.tripId));
      setSelectedOldBookingSeatIds([]);
      setSelectedNewSeatIds([]);
      setPickupPointId(
        detail.pickupPointId ? String(detail.pickupPointId) : "",
      );
      setDropoffPointId(
        detail.dropoffPointId ? String(detail.dropoffPointId) : "",
      );
      setPickupSearch("");
      setDropoffSearch("");
      setReason("");
    }
  }, [open, detail]);

  const effectiveTripId =
    newTripId || (detail?.tripId ? String(detail.tripId) : "");

  const preview = useChangeAdminTicketPreview(
    detail?.bookingId,
    open && detail && effectiveTripId
      ? {
          newTripId: Number(effectiveTripId),
          newSeatLayoutDetailIds:
            selectedNewSeatIds.length > 0 ? selectedNewSeatIds : undefined,
          pickupPointId: pickupPointId ? Number(pickupPointId) : undefined,
          dropoffPointId: dropoffPointId ? Number(dropoffPointId) : undefined,
        }
      : undefined,
  );

  const changeMutation = useChangeAdminTicketTrip();

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filteredTrips = useMemo(() => {
    const keyword = tripSearch.trim().toLowerCase();

    return (options?.trips ?? []).filter((trip) => {
      const departure = new Date(trip.departureDatetime);
      const notPast =
        departure.getTime() >= Date.now() || trip.tripId === detail?.tripId;

      const sameRoute =
        !detail ||
        trip.routeId === undefined ||
        options?.trips?.find((t) => t.tripId === detail.tripId)?.routeId ===
          undefined ||
        trip.routeId ===
          options?.trips?.find((t) => t.tripId === detail.tripId)?.routeId;

      const matchDate =
        !targetDate ||
        String(trip.departureDatetime).slice(0, 10) === targetDate;

      const matchKeyword =
        !keyword ||
        trip.tripName.toLowerCase().includes(keyword) ||
        String(trip.tripId).includes(keyword);

      return notPast && sameRoute && matchDate && matchKeyword;
    });
  }, [options?.trips, tripSearch, targetDate, detail]);

  const availableSeats = (preview.data?.availableSeats ??
    []) as ChangeSeatOption[];

  const oldPickupFallback: StopPointOption[] =
    detail?.pickupPointId && detail.pickupPointName
      ? [
          {
            pickupPointId: detail.pickupPointId,
            pointName: detail.pickupPointName,
            address: detail.pickupAddress,
          },
        ]
      : [];

  const oldDropoffFallback: StopPointOption[] =
    detail?.dropoffPointId && detail.dropoffPointName
      ? [
          {
            pickupPointId: detail.dropoffPointId,
            pointName: detail.dropoffPointName,
            address: detail.dropoffAddress,
          },
        ]
      : [];

  const relatedPickupPoints = useMemo(() => {
    const keyword = pickupSearch.trim().toLowerCase();
    const pickupPoints = preview.data?.pickupPoints ?? [];
    const points = pickupPoints.length > 0 ? pickupPoints : oldPickupFallback;

    return points.filter(
      (p) =>
        !keyword ||
        p.pointName?.toLowerCase().includes(keyword) ||
        p.address?.toLowerCase().includes(keyword),
    );
  }, [preview.data?.pickupPoints, pickupSearch, detail]);

  const relatedDropoffPoints = useMemo(() => {
    const keyword = dropoffSearch.trim().toLowerCase();
    const dropoffPoints = preview.data?.dropoffPoints ?? [];
    const points =
      dropoffPoints.length > 0 ? dropoffPoints : oldDropoffFallback;

    return points.filter(
      (p) =>
        !keyword ||
        p.pointName?.toLowerCase().includes(keyword) ||
        p.address?.toLowerCase().includes(keyword),
    );
  }, [preview.data?.dropoffPoints, dropoffSearch, detail]);

  const selectedOldSeatNames = useMemo(() => {
    return (
      detail?.seats
        .filter((seat) =>
          selectedOldBookingSeatIds.includes(seat.bookingSeatId),
        )
        .map((seat) => seat.seatNumber)
        .join(", ") || ""
    );
  }, [detail?.seats, selectedOldBookingSeatIds]);

  const selectedNewSeatNames = useMemo(() => {
    return selectedNewSeatIds
      .map(
        (id) =>
          availableSeats.find((seat) => seat.seatLayoutDetailId === id)
            ?.seatNumber || `#${id}`,
      )
      .join(", ");
  }, [selectedNewSeatIds, availableSeats]);

  const oldSeatIdsBeingReleased = useMemo(() => {
    return new Set(
      detail?.seats
        .filter((seat) =>
          selectedOldBookingSeatIds.includes(seat.bookingSeatId),
        )
        .map((seat) => seat.seatLayoutDetailId) ?? [],
    );
  }, [detail?.seats, selectedOldBookingSeatIds]);

  const floors = useMemo(() => {
    const result: Record<number, ChangeSeatOption[]> = {};
    for (const seat of availableSeats) {
      if (!result[seat.floorNo]) result[seat.floorNo] = [];
      result[seat.floorNo].push(seat);
    }
    return result;
  }, [availableSeats]);

  const getVehicleLayoutType = (seats: ChangeSeatOption[]) => {
    const totalSeats = seats.length;
    const maxFloor = Math.max(1, ...seats.map((s) => s.floorNo ?? 1));

    if (totalSeats === 9) return "Limousine 9 chỗ";
    if (totalSeats === 19) return "Limousine 19 chỗ";
    if (totalSeats === 40 || (totalSeats >= 35 && maxFloor === 2)) {
      return "Giường nằm 40 chỗ";
    }
    if (totalSeats === 22 && maxFloor === 2) return "Cabin VIP 22 phòng";

    return "Sơ đồ ghế";
  };

  const getGridDimensions = (seats: ChangeSeatOption[]) => {
    let maxRow = 0;
    let maxCol = 0;
    seats.forEach((s) => {
      if (s.rowNo > maxRow) maxRow = s.rowNo;
      if (s.columnNo > maxCol) maxCol = s.columnNo;
    });
    return { maxRow, maxCol };
  };

  if (!open || !detail) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.target === e.currentTarget) onClose();
  };

  const handleSelectTrip = (tripId: number) => {
    setNewTripId(String(tripId));
    setSelectedOldBookingSeatIds([]);
    setSelectedNewSeatIds([]);
    setPickupPointId("");
    setDropoffPointId("");
    setPickupSearch("");
    setDropoffSearch("");
  };

  const toggleOldSeat = (bookingSeatId: number) => {
    setSelectedOldBookingSeatIds((current) => {
      const next = current.includes(bookingSeatId)
        ? current.filter((id) => id !== bookingSeatId)
        : [...current, bookingSeatId];

      if (selectedNewSeatIds.length > next.length) {
        setSelectedNewSeatIds((old) => old.slice(0, next.length));
      }
      return next;
    });
  };

  const toggleNewSeat = (seatLayoutDetailId: number) => {
    const seat = availableSeats.find(
      (s) => s.seatLayoutDetailId === seatLayoutDetailId,
    );
    if (!seat) return;

    const isCurrentBookingSeat = seat.seatStatus === "CURRENT_BOOKING";
    const canReuseCurrentSeat =
      Number(effectiveTripId) === detail.tripId &&
      oldSeatIdsBeingReleased.has(seat.seatLayoutDetailId);

    const isDisabled =
      seat.seatStatus === "BOOKED" ||
      seat.seatStatus === "HOLDING" ||
      (isCurrentBookingSeat && !canReuseCurrentSeat);

    if (isDisabled) {
      toast.error("Ghế này không khả dụng để đổi vé.");
      return;
    }

    setSelectedNewSeatIds((current) => {
      if (current.includes(seatLayoutDetailId)) {
        return current.filter((id) => id !== seatLayoutDetailId);
      }
      if (selectedOldBookingSeatIds.length === 0) {
        toast.error("Vui lòng tích chọn vị trí ghế cũ cần giải phóng trước.");
        return current;
      }
      if (current.length >= selectedOldBookingSeatIds.length) {
        toast.error(
          `Chỉ được chọn tối đa ${selectedOldBookingSeatIds.length} ghế mới tương ứng.`,
        );
        return current;
      }
      return [...current, seatLayoutDetailId];
    });
  };

  const renderChangeSeat = (seat: ChangeSeatOption) => {
    const isSelected = selectedNewSeatIds.includes(seat.seatLayoutDetailId);
    const isCurrentBookingSeat = seat.seatStatus === "CURRENT_BOOKING";
    const isReleasing = oldSeatIdsBeingReleased.has(seat.seatLayoutDetailId);

    const canReuseCurrentSeat =
      Number(effectiveTripId) === detail.tripId && isReleasing;

    const isDisabled =
      seat.seatStatus === "BOOKED" ||
      seat.seatStatus === "HOLDING" ||
      (isCurrentBookingSeat && !canReuseCurrentSeat);

    return (
      <button
        key={seat.seatLayoutDetailId}
        type="button"
        disabled={isDisabled}
        className={`${styles.changeSeatButton}
          ${isSelected ? styles.selectedSeat : ""}
          ${isDisabled ? styles.disabledSeat : ""}
          ${isCurrentBookingSeat ? styles.currentSeat : ""}
          ${isReleasing ? styles.releasingSeat : ""}
        `}
        onClick={() => toggleNewSeat(seat.seatLayoutDetailId)}
      >
        <div className={styles.seatCap}></div>
        <div className={styles.seatBody}>
          <strong>{seat.seatNumber}</strong>
          <small>
            {isCurrentBookingSeat
              ? "GHẾ CŨ"
              : seat.seatStatus === "BOOKED"
                ? "ĐÃ BÁN"
                : seat.seatStatus === "HOLDING"
                  ? "ĐANG GIỮ"
                  : "TRỐNG"}
          </small>
        </div>
      </button>
    );
  };

  const renderFloorSeatGrid = (seats: ChangeSeatOption[]) => {
    const { maxRow, maxCol } = getGridDimensions(seats);
    const cellWidth =
      maxRow >= 7
        ? 120 // xe giường 40
        : maxRow >= 4
          ? 105 // limousine
          : 95;

    const cellHeight = 68;
    return (
      <div
        className={styles.seatGrid}
        style={{
          gridTemplateRows: `repeat(${maxRow}, ${cellHeight}px)`,
          gridTemplateColumns: `repeat(${maxCol}, ${cellWidth}px)`,
        }}
      >
        {seats.map((seat) => (
          <div
            key={seat.seatLayoutDetailId}
            style={{
              gridRow: seat.rowNo,
              gridColumn: seat.columnNo,
            }}
          >
            {renderChangeSeat(seat)}
          </div>
        ))}
      </div>
    );
  };

  const submit = () => {
    if (!effectiveTripId) return toast.error("Vui lòng lựa chọn chuyến đi");
    if (selectedOldBookingSeatIds.length === 0)
      return toast.error("Chưa chọn vị trí ghế gốc cần thu hồi");
    if (selectedNewSeatIds.length === 0)
      return toast.error("Chưa xác định vị trí ghế mới trên sơ đồ");
    if (selectedNewSeatIds.length !== selectedOldBookingSeatIds.length) {
      return toast.error("Số ghế mới phải bằng số ghế cũ cần đổi");
    }
    if (!reason.trim())
      return toast.error("Vui lòng ghi nhận lý do thay đổi lịch trình vé");

    changeMutation.mutate(
      {
        bookingId: detail.bookingId,
        payload: {
          newTripId: Number(effectiveTripId),
          oldBookingSeatIds: selectedOldBookingSeatIds,
          newSeatLayoutDetailIds: selectedNewSeatIds,
          pickupPointId: pickupPointId ? Number(pickupPointId) : null,
          dropoffPointId: dropoffPointId ? Number(dropoffPointId) : null,
          reason,
        },
      },
      {
        onSuccess: () => {
          toast.success("Hệ thống thay đổi hành trình đặt chỗ thành công");
          onClose();
        },
        onError: (e: any) =>
          toast.error(e.message || "Đã xảy ra lỗi hạch toán"),
      },
    );
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.largeModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>Nghiệp vụ đổi vé / Đổi chuyến hành trình</h2>
            <p>
              Hệ thống tự động tính chênh lệch biểu phí, giải phóng sơ đồ ghế cũ
              và tái cấu trúc điểm đón trả.
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

        <div className={styles.body}>
          <div className={styles.originContextBox}>
            <span className={styles.contextLabel}>Hồ sơ gốc:</span>
            <div className={styles.contextBadges}>
              <div className={styles.badgeItem}>
                Mã vé: <b>{detail.bookingCode}</b>
              </div>
              <div className={styles.badgeItem}>
                Chuyến hiện tại: <b>#{detail.tripId}</b>
              </div>
              <div className={styles.badgeItem}>
                Ghế hiện tại:{" "}
                <b>
                  {detail.seats.map((s) => s.seatNumber).join(", ") ||
                    "Chưa chọn"}
                </b>
              </div>
            </div>
          </div>

          {/* Quy trình hàng 1: Bước 1 & Bước 2 */}
          <div className={styles.workflowRowSplit}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>1</span>
                <h3>Lựa chọn chuyến xe khai thác</h3>
              </div>
              <div className={styles.filterFieldsGrid}>
                <label className={styles.formLabel}>
                  <span>Ngày khởi hành</span>
                  <input
                    type="date"
                    min={todayStart.toISOString().slice(0, 10)}
                    value={targetDate}
                    onChange={(e) => {
                      setTargetDate(e.target.value);
                      setSelectedOldBookingSeatIds([]);
                      setSelectedNewSeatIds([]);
                    }}
                  />
                </label>
                <label className={styles.formLabel}>
                  <span>Tìm chuyến</span>
                  <input
                    value={tripSearch}
                    onChange={(e) => setTripSearch(e.target.value)}
                    placeholder="Mã chuyến, tên tuyến..."
                  />
                </label>
              </div>
              <div className={styles.tripList}>
                {filteredTrips.map((trip) => {
                  const isCurrentTrip = trip.tripId === detail.tripId;
                  const isSelectedTrip =
                    Number(effectiveTripId) === trip.tripId;
                  return (
                    <button
                      key={trip.tripId}
                      type="button"
                      className={`${styles.tripOption} ${isSelectedTrip ? styles.tripOptionActive : ""} ${isCurrentTrip ? styles.tripOptionCurrent : ""}`}
                      onClick={() => handleSelectTrip(trip.tripId)}
                    >
                      <div className={styles.tripMeta}>
                        <span className={styles.tripIdTag}>#{trip.tripId}</span>
                        {isCurrentTrip && (
                          <span className={styles.currentTag}>Hiện tại</span>
                        )}
                      </div>
                      <div className={styles.tripNameText}>{trip.tripName}</div>
                    </button>
                  );
                })}
                {filteredTrips.length === 0 && (
                  <div className={styles.emptyState}>
                    Không có chuyến phù hợp với điều kiện lọc.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>2</span>
                <h3>Chọn ghế cũ cần thu hồi</h3>
              </div>
              <div className={styles.oldSeatList}>
                {detail.seats.map((seat) => {
                  const active = selectedOldBookingSeatIds.includes(
                    seat.bookingSeatId,
                  );
                  return (
                    <button
                      key={seat.bookingSeatId}
                      type="button"
                      className={`${styles.oldSeatBtn} ${active ? styles.oldSeatBtnActive : ""}`}
                      onClick={() => toggleOldSeat(seat.bookingSeatId)}
                    >
                      <div className={styles.oldSeatTop}>
                        <span className={styles.oldSeatNumber}>
                          {seat.seatNumber}
                        </span>
                        <span className={styles.checkboxReplica}></span>
                      </div>
                      <small>
                        Tầng {seat.floorNo} · Hàng {seat.rowNo} · Cột{" "}
                        {seat.columnNo}
                      </small>
                    </button>
                  );
                })}
                {detail.seats.length === 0 && (
                  <div className={styles.emptyState}>
                    Vé này chưa có ghế để đổi.
                  </div>
                )}
              </div>
              <div className={styles.selectionSummary}>
                <span>Ghế sẽ thu hồi:</span>
                <strong>{selectedOldSeatNames || "Chưa chọn"}</strong>
              </div>
            </div>
          </div>

          {/* Quy trình hàng 2: Bước 3 - Sơ đồ ghế */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.stepIndicator}>3</span>
              <h3>Sơ đồ xe & Chọn vị trí ghế mới</h3>
            </div>
            <div className={styles.seatLegendBar}>
              <div className={styles.legendItem}>
                <span
                  className={`${styles.legendBox} ${styles.bgAvailable}`}
                ></span>{" "}
                Trống
              </div>
              <div className={styles.legendItem}>
                <span
                  className={`${styles.legendBox} ${styles.bgSelected}`}
                ></span>{" "}
                Đang chọn
              </div>
              <div className={styles.legendItem}>
                <span
                  className={`${styles.legendBox} ${styles.bgCurrent}`}
                ></span>{" "}
                Ghế cũ
              </div>
              <div className={styles.legendItem}>
                <span
                  className={`${styles.legendBox} ${styles.bgReleasing}`}
                ></span>{" "}
                Sẽ giải phóng
              </div>
              <div className={styles.legendItem}>
                <span
                  className={`${styles.legendBox} ${styles.bgDisabled}`}
                ></span>{" "}
                Đã bán / Giữ chỗ
              </div>
            </div>

            {preview.isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div> Đang đồng bộ sơ đồ ghế
                thực tế...
              </div>
            ) : availableSeats.length === 0 ? (
              <div className={styles.emptyState}>
                Chưa có dữ liệu sơ đồ ghế cho chuyến này.
              </div>
            ) : (
              <div className={styles.floorList}>
                {Object.entries(floors).map(([floorNo, seats]) => (
                  <div key={floorNo} className={styles.floorCard}>
                    <div className={styles.floorTitle}>
                      {getVehicleLayoutType(availableSeats)} — Tầng {floorNo}
                    </div>
                    <div className={styles.busCabin}>
                      <div className={styles.busFront}>
                        <div className={styles.busDoor}>CỬA LÊN ▼</div>
                        <div className={styles.driverSeat}>
                          <div className={styles.steeringWheel}></div>
                          <span>TÀI XẾ</span>
                        </div>
                      </div>
                      <div className={styles.gridContainer}>
                        {renderFloorSeatGrid(seats)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.selectionSummary}>
              <span>Ghế mới đã chọn:</span>
              <strong className={styles.textPrimary}>
                {selectedNewSeatNames || "Chưa chọn"}
              </strong>
            </div>
          </section>

          {/* Quy trình hàng 3: Bước 4 & Bước 5 */}
          <div className={styles.workflowRowSplit}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>4</span>
                <h3>Điểm đón hành khách</h3>
              </div>
              <input
                className={styles.searchInput}
                value={pickupSearch}
                onChange={(e) => setPickupSearch(e.target.value)}
                placeholder="Tìm điểm đón nhanh..."
              />
              <div className={styles.pointList}>
                <button
                  type="button"
                  className={`${styles.pointOption} ${!pickupPointId ? styles.pointOptionActive : ""}`}
                  onClick={() => setPickupPointId("")}
                >
                  <strong>Bến / điểm mặc định</strong>
                  <span>Theo cấu hình mặc định của hành trình</span>
                </button>
                {relatedPickupPoints.map((point) => (
                  <button
                    key={point.pickupPointId}
                    type="button"
                    className={`${styles.pointOption} ${pickupPointId === String(point.pickupPointId) ? styles.pointOptionActive : ""}`}
                    onClick={() =>
                      setPickupPointId(String(point.pickupPointId))
                    }
                  >
                    <strong>{point.pointName}</strong>
                    <span>{point.address || "Chưa có chi tiết địa chỉ"}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>5</span>
                <h3>Điểm trả hành khách</h3>
              </div>
              <input
                className={styles.searchInput}
                value={dropoffSearch}
                onChange={(e) => setDropoffSearch(e.target.value)}
                placeholder="Tìm điểm trả nhanh..."
              />
              <div className={styles.pointList}>
                <button
                  type="button"
                  className={`${styles.pointOption} ${!dropoffPointId ? styles.pointOptionActive : ""}`}
                  onClick={() => setDropoffPointId("")}
                >
                  <strong>Bến / điểm mặc định</strong>
                  <span>Theo cấu hình mặc định của hành trình</span>
                </button>
                {relatedDropoffPoints.map((point) => (
                  <button
                    key={point.pickupPointId}
                    type="button"
                    className={`${styles.pointOption} ${dropoffPointId === String(point.pickupPointId) ? styles.pointOptionActive : ""}`}
                    onClick={() =>
                      setDropoffPointId(String(point.pickupPointId))
                    }
                  >
                    <strong>{point.pointName}</strong>
                    <span>{point.address || "Chưa có chi tiết địa chỉ"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quy trình hàng 4: Bước 6 - Hạch toán tổng duyệt */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.stepIndicator}>6</span>
              <h3>Báo cáo hạch toán chênh lệch & Xác nhận</h3>
            </div>
            <div className={styles.previewGrid}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Chi phí vé cũ</span>
                <strong className={styles.kpiValue}>
                  {formatCurrency(preview.data?.oldTotalAmount ?? 0)}
                </strong>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Chi phí hành trình mới</span>
                <strong className={styles.kpiValue}>
                  {formatCurrency(preview.data?.newTotalAmount ?? 0)}
                </strong>
              </div>
              <div
                className={`${styles.kpiCard} ${(preview.data?.priceDifference ?? 0) > 0 ? styles.kpiDanger : (preview.data?.priceDifference ?? 0) < 0 ? styles.kpiSuccess : ""}`}
              >
                <span className={styles.kpiLabel}>Chênh lệch tổng chi phí</span>
                <strong className={styles.kpiValue}>
                  {formatCurrency(preview.data?.priceDifference ?? 0)}
                </strong>
              </div>
              <div
                className={`${styles.kpiCard} ${preview.data?.needExtraPayment ? styles.kpiDanger : preview.data?.needRefund ? styles.kpiSuccess : ""}`}
              >
                <span className={styles.kpiLabel}>
                  Trạng thái xử lý dòng tiền
                </span>
                <strong className={styles.kpiValue}>
                  {preview.data?.needExtraPayment
                    ? "Thu thêm tiền"
                    : preview.data?.needRefund
                      ? "Hoàn lại tiền"
                      : "Cân bằng tài chính"}
                </strong>
              </div>
            </div>

            {preview.data?.warnings && preview.data.warnings.length > 0 && (
              <div className={styles.warningBox}>
                {preview.data.warnings.map((w) => (
                  <p key={w}>⚠️ {w}</p>
                ))}
              </div>
            )}

            <label className={styles.formLabelTextarea}>
              <span>
                Lý do thay đổi lịch trình vé{" "}
                <span className={styles.required}>*</span>
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do chi tiết nghiệp vụ quản trị viên (bắt buộc)..."
                rows={3}
              />
            </label>
          </section>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Đóng cửa sổ
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            disabled={changeMutation.isPending}
            onClick={submit}
          >
            {changeMutation.isPending
              ? "Hệ thống đang xử lý..."
              : "Xác nhận tác vụ đổi vé"}
          </button>
        </div>
      </div>
    </div>
  );
}
