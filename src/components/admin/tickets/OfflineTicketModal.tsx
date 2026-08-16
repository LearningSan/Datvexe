"use client";

import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  useAdminOfflineTicketFilterOptions,
  useAdminOfflineTicketPreview,
  useAdminOfflineTripSearch,
} from "@/hooks/admin/useTickets";

import type {
  AdminOfflineTripSeat,
  AdminOfflineTripSearchItem,
  CreateOfflineTicketPayload,
  AdminTicketAvailableSeat,
} from "@/types/admin/tickets/ticket-management.type";
import SeatMap from "@/components/admin/AdminSeatMap";
import { formatCurrency, formatDateTimeVN } from "@/lib/client/helpers";

import styles from "./OfflineTicketModal.module.css";

interface Props {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateOfflineTicketPayload) => void;
}

type TimeMode = "ALL" | "MORNING" | "NOON" | "AFTERNOON" | "EVENING" | "CUSTOM";

const getToday = () => {
  return new Date().toISOString().slice(0, 10);
};

const parseLocalDatetime = (value: string) => {
  return new Date(String(value).replace(" ", "T"));
};

const formatDuration = (minutes: number) => {
  if (!minutes || minutes <= 0) return "—";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;

  return `${hours} giờ ${mins} phút`;
};

export default function OfflineTicketModal({
  open,
  loading,
  onClose,
  onSubmit,
}: Props) {
  /*
   * ============================================================
   * 1. TRA CỨU CHUYẾN
   * ============================================================
   */

  const [originCityId, setOriginCityId] = useState("");
  const [destinationCityId, setDestinationCityId] = useState("");

  const [targetDate, setTargetDate] = useState(getToday());

  const [timeMode, setTimeMode] = useState<TimeMode>("ALL");
  const [customTime, setCustomTime] = useState("");

  const [vehicleTypeId, setVehicleTypeId] = useState("");

  const [hasSearched, setHasSearched] = useState(false);

  /*
   * ============================================================
   * 2. CHUYẾN ĐANG ĐƯỢC CHỌN
   * ============================================================
   */

  const [tripId, setTripId] = useState<number | null>(null);

  /*
   * ============================================================
   * 3. THÔNG TIN KHÁCH
   * ============================================================
   */

  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");

  /*
   * ============================================================
   * 4. ĐIỂM ĐÓN / ĐIỂM TRẢ
   * ============================================================
   */

  const [pickupPointId, setPickupPointId] = useState("");
  const [dropoffPointId, setDropoffPointId] = useState("");

  const [pickupSearch, setPickupSearch] = useState("");
  const [dropoffSearch, setDropoffSearch] = useState("");

  /*
   * ============================================================
   * 5. GHẾ
   * ============================================================
   */

  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);

  /*
   * ============================================================
   * 6. THANH TOÁN
   * ============================================================
   */

  const [paid, setPaid] = useState(true);

  /*
   * ============================================================
   * SEARCH PARAMS
   * ============================================================
   */

  const timeRange = useMemo(() => {
    switch (timeMode) {
      case "MORNING":
        return {
          timeFrom: "05:00",
          timeTo: "11:59",
        };

      case "NOON":
        return {
          timeFrom: "11:00",
          timeTo: "13:59",
        };

      case "AFTERNOON":
        return {
          timeFrom: "12:00",
          timeTo: "17:59",
        };

      case "EVENING":
        return {
          timeFrom: "18:00",
          timeTo: "23:59",
        };

      case "CUSTOM":
        if (!customTime) {
          return {};
        }

        return {
          timeFrom: customTime,
          timeTo: customTime,
        };

      default:
        return {};
    }
  }, [timeMode, customTime]);

  const searchParams = useMemo(() => {
    if (!originCityId || !destinationCityId || !targetDate) {
      return null;
    }

    return {
      originCityId: Number(originCityId),
      destinationCityId: Number(destinationCityId),
      date: targetDate,
      ...(timeRange.timeFrom ? { timeFrom: timeRange.timeFrom } : {}),
      ...(timeRange.timeTo ? { timeTo: timeRange.timeTo } : {}),
      ...(vehicleTypeId ? { vehicleTypeId: Number(vehicleTypeId) } : {}),
    };
  }, [originCityId, destinationCityId, targetDate, timeRange, vehicleTypeId]);
  const filterOptions = useAdminOfflineTicketFilterOptions(open);
  const tripSearch = useAdminOfflineTripSearch(
    hasSearched ? searchParams : null,
  );

  /*
   * ============================================================
   * PREVIEW CHUYẾN
   * ============================================================
   */

  const preview = useAdminOfflineTicketPreview(tripId);

  /*
   * ============================================================
   * OPTIONS
   * ============================================================
   */

  const cities = filterOptions.data?.cities ?? [];

  const vehicleTypes = filterOptions.data?.vehicleTypes ?? [];

  /*
   * ============================================================
   * RESET MODAL
   * ============================================================
   */

  useEffect(() => {
    if (!open) return;

    setOriginCityId("");
    setDestinationCityId("");

    setTargetDate(getToday());

    setTimeMode("ALL");
    setCustomTime("");

    setVehicleTypeId("");

    setHasSearched(false);

    setTripId(null);

    setPassengerName("");
    setPassengerPhone("");
    setPassengerEmail("");

    setPickupPointId("");
    setDropoffPointId("");

    setPickupSearch("");
    setDropoffSearch("");

    setSelectedSeatIds([]);

    setPaid(true);
  }, [open]);

  /*
   * ============================================================
   * SELECTED TRIP
   * ============================================================
   */

  const selectedTrip = useMemo<AdminOfflineTripSearchItem | null>(() => {
    const trips = tripSearch.data ?? [];

    return trips.find((trip) => Number(trip.tripId) === Number(tripId)) ?? null;
  }, [tripSearch.data, tripId]);

  /*
   * ============================================================
   * SEATS
   * ============================================================
   */

  const seats = preview.data?.availableSeats ?? [];
  const adminSeatMapSeats = useMemo<AdminTicketAvailableSeat[]>(() => {
    return seats.map((seat) => ({
      seatLayoutDetailId: seat.seatLayoutDetailId,
      seatNumber: seat.seatNumber,
      floorNo: seat.floorNo,
      rowNo: seat.rowNo,
      columnNo: seat.columnNo,
      bookingSeatId: null,
      seatStatus: seat.seatStatus,
      isCurrentBooking: false,
      checkinStatus: null,
    }));
  }, [seats]);
  /*
   * ============================================================
   * PICKUP POINTS
   * ============================================================
   */

  const pickupPoints = useMemo(() => {
    const keyword = pickupSearch.trim().toLowerCase();

    return (preview.data?.pickupPoints ?? []).filter((point) => {
      const text = [
        point.pointName,
        point.address,
        point.cityName,
        point.zoneName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !keyword || text.includes(keyword);
    });
  }, [preview.data?.pickupPoints, pickupSearch]);

  /*
   * ============================================================
   * DROPOFF POINTS
   * ============================================================
   */

  const dropoffPoints = useMemo(() => {
    const keyword = dropoffSearch.trim().toLowerCase();

    return (preview.data?.dropoffPoints ?? []).filter((point) => {
      const text = [
        point.pointName,
        point.address,
        point.cityName,
        point.zoneName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !keyword || text.includes(keyword);
    });
  }, [preview.data?.dropoffPoints, dropoffSearch]);

  /*
   * ============================================================
   * FLOOR
   * ============================================================
   */

  const floors = useMemo(() => {
    const result: Record<number, AdminOfflineTripSeat[]> = {};

    for (const seat of seats) {
      if (!result[seat.floorNo]) {
        result[seat.floorNo] = [];
      }

      result[seat.floorNo].push(seat);
    }

    return result;
  }, [seats]);

  /*
   * ============================================================
   * SELECTED SEATS
   * ============================================================
   */

  const selectedSeatNames = useMemo(() => {
    return selectedSeatIds
      .map(
        (id) =>
          seats.find((seat) => seat.seatLayoutDetailId === id)?.seatNumber ??
          `#${id}`,
      )
      .join(", ");
  }, [selectedSeatIds, seats]);

  /*
   * ============================================================
   * TOTAL
   * ============================================================
   */

  const totalAmount =
    selectedSeatIds.length * Number(preview.data?.ticketPrice ?? 0);

  /*
   * ============================================================
   * SEARCH
   * ============================================================
   */

  const handleSearch = () => {
    if (!originCityId) {
      toast.error("Vui lòng chọn điểm đi.");
      return;
    }

    if (!destinationCityId) {
      toast.error("Vui lòng chọn điểm đến.");
      return;
    }

    if (Number(originCityId) === Number(destinationCityId)) {
      toast.error("Điểm đi và điểm đến không được giống nhau.");
      return;
    }

    if (!targetDate) {
      toast.error("Vui lòng chọn ngày khởi hành.");
      return;
    }

    if (timeMode === "CUSTOM" && !customTime) {
      toast.error("Vui lòng nhập thời gian muốn tra cứu.");
      return;
    }

    setTripId(null);
    setSelectedSeatIds([]);

    setPickupPointId("");
    setDropoffPointId("");

    setHasSearched(true);
  };

  /*
   * ============================================================
   * CHỌN CHUYẾN
   * ============================================================
   */

  const handleSelectTrip = (trip: AdminOfflineTripSearchItem) => {
    setTripId(trip.tripId);

    setSelectedSeatIds([]);

    setPickupPointId("");
    setDropoffPointId("");

    setPickupSearch("");
    setDropoffSearch("");
  };

  /*
   * ============================================================
   * CHỌN GHẾ
   * ============================================================
   */

  const toggleSeat = (seat: AdminOfflineTripSeat) => {
    if (seat.seatStatus !== "AVAILABLE") {
      if (seat.seatStatus === "BOOKED") {
        toast.error("Ghế này đã bán.");
      } else {
        toast.error("Ghế này đang được giữ.");
      }

      return;
    }

    setSelectedSeatIds((current) =>
      current.includes(seat.seatLayoutDetailId)
        ? current.filter((id) => id !== seat.seatLayoutDetailId)
        : [...current, seat.seatLayoutDetailId],
    );
  };

  /*
   * ============================================================
   * GRID
   * ============================================================
   */

  const getGridDimensions = (floorSeats: AdminOfflineTripSeat[]) => {
    let maxRow = 0;
    let maxCol = 0;

    floorSeats.forEach((seat) => {
      maxRow = Math.max(maxRow, seat.rowNo);

      maxCol = Math.max(maxCol, seat.columnNo);
    });

    return {
      maxRow,
      maxCol,
    };
  };

  /*
   * ============================================================
   * VEHICLE LAYOUT NAME
   * ============================================================
   */

  const getVehicleLayoutName = () => {
    if (preview.data?.vehicleTypeName) {
      return preview.data.vehicleTypeName;
    }

    const totalSeats = preview.data?.totalSeats ?? seats.length;

    const maxFloor = Math.max(1, ...seats.map((seat) => seat.floorNo ?? 1));

    if (totalSeats === 9) {
      return "Limousine 9 chỗ";
    }

    if (totalSeats === 19) {
      return "Limousine 19 chỗ";
    }

    if (totalSeats === 40 || (totalSeats >= 35 && maxFloor === 2)) {
      return "Giường nằm 40 chỗ";
    }

    if (totalSeats === 22 && maxFloor === 2) {
      return "Cabin VIP 22 phòng";
    }

    return "Sơ đồ ghế";
  };

  /*
   * ============================================================
   * RENDER SEAT
   * ============================================================
   */

  const renderSeat = (seat: AdminOfflineTripSeat) => {
    const isSelected = selectedSeatIds.includes(seat.seatLayoutDetailId);

    const isBooked = seat.seatStatus === "BOOKED";

    const isHolding = seat.seatStatus === "HOLDING";

    const isDisabled = isBooked || isHolding;

    return (
      <button
        key={seat.seatLayoutDetailId}
        type="button"
        disabled={isDisabled}
        className={`${styles.changeSeatButton}
          ${isSelected ? styles.selectedSeat : ""}
          ${isBooked ? styles.bookedSeat : ""}
          ${isHolding ? styles.holdingSeat : ""}
          ${isDisabled ? styles.disabledSeat : ""}
        `}
        onClick={() => toggleSeat(seat)}
      >
        <div className={styles.seatCap} />

        <div className={styles.seatBody}>
          <strong>{seat.seatNumber}</strong>

          <small>
            {isBooked
              ? "ĐÃ BÁN"
              : isHolding
                ? "ĐANG GIỮ"
                : isSelected
                  ? "ĐANG CHỌN"
                  : "TRỐNG"}
          </small>
        </div>
      </button>
    );
  };

  /*
   * ============================================================
   * RENDER FLOOR
   * ============================================================
   */

  const renderFloorSeatGrid = (floorSeats: AdminOfflineTripSeat[]) => {
    const { maxRow, maxCol } = getGridDimensions(floorSeats);

    return (
      <div
        className={styles.seatGrid}
        style={{
          gridTemplateRows: `repeat(${maxRow}, 62px)`,
          gridTemplateColumns: `repeat(${maxCol}, 86px)`,
        }}
      >
        {floorSeats.map((seat) => (
          <div
            key={seat.seatLayoutDetailId}
            style={{
              gridRow: seat.rowNo,
              gridColumn: seat.columnNo,
            }}
            className={styles.gridCell}
          >
            {renderSeat(seat)}
          </div>
        ))}
      </div>
    );
  };

  /*
   * ============================================================
   * VALIDATE CUSTOMER
   * ============================================================
   */

  const validateCustomer = () => {
    const name = passengerName.trim();

    const phone = passengerPhone.trim();

    const email = passengerEmail.trim();

    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name) {
      toast.error("Vui lòng nhập họ tên hành khách.");
      return false;
    }

    if (name.length < 2) {
      toast.error("Họ tên hành khách quá ngắn.");
      return false;
    }

    if (!phone) {
      toast.error("Vui lòng nhập số điện thoại.");
      return false;
    }

    if (!phoneRegex.test(phone)) {
      toast.error("Số điện thoại không đúng định dạng Việt Nam.");
      return false;
    }

    if (email && !emailRegex.test(email)) {
      toast.error("Email không hợp lệ.");
      return false;
    }

    return true;
  };

  /*
   * ============================================================
   * SUBMIT
   * ============================================================
   */

  const submit = (e: FormEvent) => {
    e.preventDefault();

    if (!tripId) {
      toast.error("Vui lòng chọn chuyến xe.");
      return;
    }

    if (!validateCustomer()) {
      return;
    }

    if (selectedSeatIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một ghế.");
      return;
    }

    onSubmit({
      tripId,

      passengerName: passengerName.trim(),

      passengerPhone: passengerPhone.trim(),

      passengerEmail: passengerEmail.trim() || null,

      pickupPointId: pickupPointId ? Number(pickupPointId) : null,

      dropoffPointId: dropoffPointId ? Number(dropoffPointId) : null,

      seatLayoutDetailIds: selectedSeatIds,

      paid,
    });
  };

  /*
   * ============================================================
   * BACKDROP
   * ============================================================
   */

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) {
    return null;
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.largeModal} onClick={(e) => e.stopPropagation()}>
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div className={styles.header}>
          <div>
            <h2>Tra cứu & lập vé tại quầy</h2>

            <p>
              Tra cứu nhanh chuyến xe, kiểm tra số ghế còn lại và lập vé cho
              khách hàng.
            </p>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className={styles.body}>
          {/* ================================================== */}
          {/* STEP 1 - SEARCH */}
          {/* ================================================== */}

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.stepIndicator}>1</span>

              <div>
                <h3>Tra cứu chuyến xe</h3>

                <p>Tìm chuyến theo tuyến, ngày, thời gian và loại xe.</p>
              </div>
            </div>

            <div className={styles.filterFieldsGrid}>
              {/* ĐIỂM ĐI */}

              <label className={styles.formLabel}>
                <span>Điểm đi *</span>

                <select
                  value={originCityId}
                  onChange={(e) => {
                    setOriginCityId(e.target.value);

                    setHasSearched(false);

                    setTripId(null);
                  }}
                >
                  <option value="">Chọn điểm đi</option>

                  {cities.map((city) => (
                    <option key={city.cityId} value={city.cityId}>
                      {city.cityName}
                    </option>
                  ))}
                </select>
              </label>

              {/* ĐIỂM ĐẾN */}

              <label className={styles.formLabel}>
                <span>Điểm đến *</span>

                <select
                  value={destinationCityId}
                  onChange={(e) => {
                    setDestinationCityId(e.target.value);

                    setHasSearched(false);

                    setTripId(null);
                  }}
                >
                  <option value="">Chọn điểm đến</option>

                  {cities.map((city) => (
                    <option key={city.cityId} value={city.cityId}>
                      {city.cityName}
                    </option>
                  ))}
                </select>
              </label>

              {/* NGÀY */}

              <label className={styles.formLabel}>
                <span>Ngày khởi hành *</span>

                <input
                  type="date"
                  value={targetDate}
                  min={getToday()}
                  onChange={(e) => {
                    setTargetDate(e.target.value);

                    setHasSearched(false);

                    setTripId(null);
                  }}
                />
              </label>

              {/* LOẠI XE */}

              <label className={styles.formLabel}>
                <span>Loại xe</span>

                <select
                  value={vehicleTypeId}
                  onChange={(e) => {
                    setVehicleTypeId(e.target.value);

                    setHasSearched(false);

                    setTripId(null);
                  }}
                >
                  <option value="">Tất cả loại xe</option>

                  {vehicleTypes.map((type) => (
                    <option key={type.vehicleTypeId} value={type.vehicleTypeId}>
                      {type.typeName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* KHUNG GIỜ */}

            <div className={styles.timeSearchSection}>
              <div className={styles.timeSearchTitle}>Khung giờ khởi hành</div>

              <div className={styles.timeModeGrid}>
                {[
                  {
                    value: "ALL",
                    label: "Tất cả",
                  },
                  {
                    value: "MORNING",
                    label: "Buổi sáng",
                  },
                  {
                    value: "NOON",
                    label: "Buổi trưa",
                  },
                  {
                    value: "AFTERNOON",
                    label: "Buổi chiều",
                  },
                  {
                    value: "EVENING",
                    label: "Buổi tối",
                  },
                  {
                    value: "CUSTOM",
                    label: "Giờ cụ thể",
                  },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`${styles.timeModeButton}
                        ${
                          timeMode === item.value
                            ? styles.timeModeButtonActive
                            : ""
                        }
                      `}
                    onClick={() => setTimeMode(item.value as TimeMode)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {timeMode === "CUSTOM" && (
                <div className={styles.customTimeRow}>
                  <label className={styles.formLabel}>
                    <span>Giờ khách muốn đi</span>

                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* SEARCH BUTTON */}

            <div className={styles.searchAction}>
              <button
                type="button"
                className={styles.searchBtn}
                onClick={handleSearch}
                disabled={tripSearch.isFetching}
              >
                {tripSearch.isFetching
                  ? "Đang tra cứu..."
                  : "🔎 Tra cứu chuyến"}
              </button>
            </div>
          </section>

          {/* ================================================== */}
          {/* STEP 2 - SEARCH RESULT */}
          {/* ================================================== */}

          {hasSearched && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>2</span>

                <div>
                  <h3>Danh sách chuyến</h3>

                  <p>
                    Đây là danh sách chuyến phù hợp để CSKH tư vấn cho khách.
                  </p>
                </div>
              </div>

              {tripSearch.isFetching ? (
                <div className={styles.loadingState}>
                  <div className={styles.smallSpinner} />
                  Đang tìm chuyến phù hợp...
                </div>
              ) : tripSearch.isError ? (
                <div className={styles.emptyState}>
                  Không thể tải danh sách chuyến.
                </div>
              ) : (
                <>
                  <div className={styles.searchResultSummary}>
                    <strong>
                      {(tripSearch.data ?? []).length} chuyến phù hợp
                    </strong>

                    <span>{targetDate}</span>
                  </div>

                  <div className={styles.tripList}>
                    {(tripSearch.data ?? []).map((trip) => {
                      const active = trip.tripId === tripId;

                      return (
                        <button
                          key={trip.tripId}
                          type="button"
                          className={`${styles.tripOption}
                              ${active ? styles.tripOptionActive : ""}
                            `}
                          onClick={() => handleSelectTrip(trip)}
                        >
                          <div className={styles.tripResultTop}>
                            <div>
                              <span className={styles.tripIdTag}>
                                #{trip.tripId}
                              </span>

                              <strong className={styles.tripDeparture}>
                                {formatDateTimeVN(trip.departureDatetime)}
                              </strong>
                            </div>

                            <span
                              className={`${styles.availabilityBadge}
                                  ${
                                    trip.availabilityStatus === "AVAILABLE"
                                      ? styles.availabilityAvailable
                                      : trip.availabilityStatus === "LIMITED"
                                        ? styles.availabilityLimited
                                        : styles.availabilityFull
                                  }
                                `}
                            >
                              {trip.availabilityStatus === "AVAILABLE"
                                ? "Còn nhiều ghế"
                                : trip.availabilityStatus === "LIMITED"
                                  ? "Sắp hết ghế"
                                  : "Hết ghế"}
                            </span>
                          </div>

                          <div className={styles.tripRouteText}>
                            {trip.routeName}
                          </div>

                          <div className={styles.tripVehicleLine}>
                            <span>
                              🚌 {trip.vehicleTypeName ?? "Chưa xác định"}
                            </span>

                            <span>
                              ⏱ {formatDuration(trip.durationMinutes)}
                            </span>

                            <span>
                              💺 {trip.availableSeatCount}/{trip.totalSeats} ghế
                              trống
                            </span>

                            <span>{formatCurrency(trip.ticketPrice)}</span>
                          </div>

                          <div className={styles.tripSeatStats}>
                            <span>Đã bán: {trip.bookedSeats}</span>

                            <span>Đang giữ: {trip.holdingSeats}</span>

                            <span>Còn trống: {trip.availableSeatCount}</span>
                          </div>
                        </button>
                      );
                    })}

                    {(tripSearch.data ?? []).length === 0 && (
                      <div className={styles.emptyState}>
                        Không tìm thấy chuyến phù hợp với điều kiện tra cứu.
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {/* ================================================== */}
          {/* STEP 3 - SELECTED TRIP */}
          {/* ================================================== */}

          {tripId && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>3</span>

                <div>
                  <h3>Chuyến khách lựa chọn</h3>

                  <p>Kiểm tra lại thông tin chuyến trước khi tư vấn ghế.</p>
                </div>
              </div>

              {selectedTrip && (
                <div className={styles.selectedTripCard}>
                  <div className={styles.selectedTripMain}>
                    <span>Chuyến #{selectedTrip.tripId}</span>

                    <strong>
                      {formatDateTimeVN(selectedTrip.departureDatetime)}
                    </strong>

                    <strong>{selectedTrip.routeName}</strong>
                  </div>

                  <div className={styles.selectedTripStats}>
                    <div>
                      <span>Đến nơi</span>

                      <strong>
                        {formatDateTimeVN(selectedTrip.arrivalDatetime)}
                      </strong>
                    </div>

                    <div>
                      <span>Thời gian</span>

                      <strong>
                        {formatDuration(selectedTrip.durationMinutes)}
                      </strong>
                    </div>

                    <div>
                      <span>Loại xe</span>

                      <strong>{selectedTrip.vehicleTypeName ?? "—"}</strong>
                    </div>

                    <div>
                      <span>Ghế còn</span>

                      <strong className={styles.availableSeatNumber}>
                        {selectedTrip.availableSeatCount} /{" "}
                        {selectedTrip.totalSeats}
                      </strong>
                    </div>

                    <div>
                      <span>Giá vé</span>

                      <strong>
                        {formatCurrency(selectedTrip.ticketPrice)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {preview.isLoading ? (
                <div className={styles.loadingState}>
                  <div className={styles.smallSpinner} />
                  Đang kiểm tra ghế thực tế...
                </div>
              ) : preview.data ? (
                <div className={styles.seatAvailabilitySummary}>
                  <div>
                    <span>Tổng ghế</span>

                    <strong>{preview.data.totalSeats}</strong>
                  </div>

                  <div>
                    <span>Còn trống</span>

                    <strong className={styles.availableText}>
                      {preview.data.availableSeatCount}
                    </strong>
                  </div>

                  <div>
                    <span>Đã bán</span>

                    <strong>{preview.data.bookedSeatCount}</strong>
                  </div>

                  <div>
                    <span>Đang giữ</span>

                    <strong>{preview.data.holdingSeatCount}</strong>
                  </div>
                </div>
              ) : null}
            </section>
          )}

          {/* ================================================== */}
          {/* STEP 4 - CUSTOMER */}
          {/* ================================================== */}

          {tripId && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>4</span>

                <div>
                  <h3>Thông tin hành khách</h3>

                  <p>Nhập thông tin sau khi khách đã xác nhận chuyến.</p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.formLabel}>
                  <span>Họ tên *</span>

                  <input
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </label>

                <label className={styles.formLabel}>
                  <span>Số điện thoại *</span>

                  <input
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    placeholder="0912345678"
                  />
                </label>

                <label className={`${styles.formLabel} ${styles.fullWidth}`}>
                  <span>Email</span>

                  <input
                    type="email"
                    value={passengerEmail}
                    onChange={(e) => setPassengerEmail(e.target.value)}
                    placeholder="khachhang@gmail.com"
                  />
                </label>
              </div>
            </section>
          )}

          {/* ================================================== */}
          {/* STEP 5 - PICKUP / DROPOFF */}
          {/* ================================================== */}

          {tripId && preview.data && (
            <div className={styles.workflowRowSplit}>
              {/* PICKUP */}

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span className={styles.stepIndicator}>5A</span>

                  <h3>Điểm đón</h3>
                </div>

                <input
                  className={styles.searchInput}
                  value={pickupSearch}
                  onChange={(e) => setPickupSearch(e.target.value)}
                  placeholder="Tìm điểm đón..."
                />

                <div className={styles.pointList}>
                  <button
                    type="button"
                    className={`${styles.pointOption}
                        ${!pickupPointId ? styles.pointOptionActive : ""}
                      `}
                    onClick={() => setPickupPointId("")}
                  >
                    <strong>Điểm đi mặc định</strong>

                    <span>Theo điểm khởi hành của chuyến</span>
                  </button>

                  {pickupPoints.map((point) => (
                    <button
                      key={point.pickupPointId}
                      type="button"
                      className={`${styles.pointOption}
                            ${
                              pickupPointId === String(point.pickupPointId)
                                ? styles.pointOptionActive
                                : ""
                            }
                          `}
                      onClick={() =>
                        setPickupPointId(String(point.pickupPointId))
                      }
                    >
                      <strong>{point.pointName}</strong>

                      <span>{point.address ?? point.zoneName ?? "—"}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* DROPOFF */}

              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <span className={styles.stepIndicator}>5B</span>

                  <h3>Điểm trả</h3>
                </div>

                <input
                  className={styles.searchInput}
                  value={dropoffSearch}
                  onChange={(e) => setDropoffSearch(e.target.value)}
                  placeholder="Tìm điểm trả..."
                />

                <div className={styles.pointList}>
                  <button
                    type="button"
                    className={`${styles.pointOption}
                        ${!dropoffPointId ? styles.pointOptionActive : ""}
                      `}
                    onClick={() => setDropoffPointId("")}
                  >
                    <strong>Điểm đến mặc định</strong>

                    <span>Theo điểm kết thúc của chuyến</span>
                  </button>

                  {dropoffPoints.map((point) => (
                    <button
                      key={point.pickupPointId}
                      type="button"
                      className={`${styles.pointOption}
                            ${
                              dropoffPointId === String(point.pickupPointId)
                                ? styles.pointOptionActive
                                : ""
                            }
                          `}
                      onClick={() =>
                        setDropoffPointId(String(point.pickupPointId))
                      }
                    >
                      <strong>{point.pointName}</strong>

                      <span>{point.address ?? point.zoneName ?? "—"}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ================================================== */}
          {/* STEP 6 - SEATS */}
          {/* ================================================== */}

          {tripId && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>6</span>

                <div>
                  <h3>Chọn ghế</h3>

                  <p>Chọn một hoặc nhiều ghế còn trống cho khách hàng.</p>
                </div>
              </div>

              <div className={styles.seatLegendBar}>
                <div className={styles.legendItem}>
                  <span
                    className={`${styles.legendBox} ${styles.bgAvailable}`}
                  />
                  Trống
                </div>

                <div className={styles.legendItem}>
                  <span
                    className={`${styles.legendBox} ${styles.bgSelected}`}
                  />
                  Đang chọn
                </div>

                <div className={styles.legendItem}>
                  <span className={`${styles.legendBox} ${styles.bgBooked}`} />
                  Đã bán
                </div>

                <div className={styles.legendItem}>
                  <span className={`${styles.legendBox} ${styles.bgHolding}`} />
                  Đang giữ
                </div>
              </div>

              {preview.isLoading ? (
                <div className={styles.loadingState}>
                  <div className={styles.smallSpinner} />
                  Đang tải sơ đồ ghế...
                </div>
              ) : seats.length === 0 ? (
                <div className={styles.emptyState}>
                  Chuyến này không còn ghế trống.
                </div>
              ) : (
                <div className={styles.adminSeatMapWrapper}>
                  <SeatMap
                    seats={adminSeatMapSeats}
                    layoutName={preview.data?.vehicleTypeName ?? null}
                    mode="ADD"
                    selectedSeatIds={selectedSeatIds}
                    selectedOldBookingSeatIds={[]}
                    onSelectSeat={(seatId) => {
                      setSelectedSeatIds((current) =>
                        current.includes(seatId)
                          ? current.filter((id) => id !== seatId)
                          : [...current, seatId],
                      );
                    }}
                  />
                </div>
              )}

              <div className={styles.selectionSummary}>
                <span>Ghế đã chọn:</span>

                <strong className={styles.seatsHighlight}>
                  {selectedSeatNames || "Chưa chọn ghế"}
                </strong>
              </div>
            </section>
          )}

          {/* ================================================== */}
          {/* STEP 7 - PAYMENT */}
          {/* ================================================== */}

          {tripId && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>7</span>

                <h3>Xác nhận & thu tiền</h3>
              </div>

              <div className={styles.previewGrid}>
                <div className={styles.kpiCard}>
                  <span>Số vé</span>

                  <strong>{selectedSeatIds.length}</strong>
                </div>

                <div className={styles.kpiCard}>
                  <span>Giá / vé</span>

                  <strong>
                    {formatCurrency(preview.data?.ticketPrice ?? 0)}
                  </strong>
                </div>

                <div className={styles.kpiCard}>
                  <span>Tổng tiền</span>

                  <strong className={styles.totalPriceHighlight}>
                    {formatCurrency(totalAmount)}
                  </strong>
                </div>
              </div>

              <div className={styles.statusBox}>
                <label className={styles.checkLine}>
                  <input
                    type="checkbox"
                    checked={paid}
                    onChange={(e) => setPaid(e.target.checked)}
                  />

                  <div className={styles.checkText}>
                    <strong>Đã hoàn thành thu tiền</strong>

                    <p>
                      Đánh dấu nếu khách đã trả tiền mặt hoặc chuyển khoản tại
                      quầy.
                    </p>
                  </div>
                </label>
              </div>
            </section>
          )}

          {/* ================================================== */}
          {/* FOOTER */}
          {/* ================================================== */}

          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !tripId || selectedSeatIds.length === 0}
            >
              {loading ? "Đang xử lý..." : "Xác nhận tạo vé"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
