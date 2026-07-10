"use client";

import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAdminOfflineTicketPreview } from "@/hooks/admin/useTickets";
import type {
  AdminOfflineTripSeat,
  AdminTicketOptionsResponse,
  CreateOfflineTicketPayload,
} from "@/types/admin/tickets/ticket-management.type";
import { formatCurrency, formatDateTimeVN } from "@/lib/client/helpers";
import styles from "./OfflineTicketModal.module.css";

interface Props {
  open: boolean;
  options?: AdminTicketOptionsResponse;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateOfflineTicketPayload) => void;
}

export default function OfflineTicketModal({
  open,
  options,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const getToday = () => new Date().toISOString().slice(0, 10);

  const [targetDate, setTargetDate] = useState(getToday());
  const [tripSearch, setTripSearch] = useState("");
  const [tripId, setTripId] = useState("");

  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");

  const [pickupPointId, setPickupPointId] = useState("");
  const [dropoffPointId, setDropoffPointId] = useState("");
  const [pickupSearch, setPickupSearch] = useState("");
  const [dropoffSearch, setDropoffSearch] = useState("");

  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [paid, setPaid] = useState(true);

  const preview = useAdminOfflineTicketPreview(tripId ? Number(tripId) : null);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("");
  const parseLocalDatetime = (value: string) => {
    return new Date(value.replace(" ", "T"));
  };

  const tripsByDate = useMemo(() => {
    const now = new Date();

    return (options?.trips ?? []).filter((trip) => {
      const departureText = String(trip.departureDatetime);
      const departure = parseLocalDatetime(departureText);
      const tripDate = departureText.slice(0, 10);

      if (departure.getTime() < now.getTime()) return false;

      if (!targetDate) return true;

      return tripDate === targetDate;
    });
  }, [options?.trips, targetDate]);
  const vehicleTypeOptions = useMemo(() => {
    const names = tripsByDate
      .map((trip) => trip.vehicleTypeName)
      .filter(Boolean) as string[];

    return Array.from(new Set(names));
  }, [tripsByDate]);
  useEffect(() => {
    if (!open) return;

    setTargetDate(getToday());
    setTripSearch("");
    setTripId("");
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

  const selectedTrip = useMemo(() => {
    return (options?.trips ?? []).find(
      (trip) => String(trip.tripId) === String(tripId),
    );
  }, [options?.trips, tripId]);

  const filteredTrips = useMemo(() => {
    const keyword = tripSearch.trim().toLowerCase();

    return tripsByDate.filter((trip) => {
      const matchVehicleType =
        !vehicleTypeFilter || trip.vehicleTypeName === vehicleTypeFilter;

      const searchableText = [
        String(trip.tripId),
        trip.tripName,
        trip.departureDatetime,
        trip.vehicleTypeName,
        trip.vehicleName,
        trip.licensePlate,
        trip.totalSeats ? `${trip.totalSeats}` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchVehicleType && (!keyword || searchableText.includes(keyword));
    });
  }, [tripsByDate, tripSearch, vehicleTypeFilter]);
  const seats = preview.data?.availableSeats ?? [];

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

  const floors = useMemo(() => {
    const result: Record<number, AdminOfflineTripSeat[]> = {};

    for (const seat of seats) {
      if (!result[seat.floorNo]) result[seat.floorNo] = [];
      result[seat.floorNo].push(seat);
    }

    return result;
  }, [seats]);

  const selectedSeatNames = useMemo(() => {
    return selectedSeatIds
      .map(
        (id) =>
          seats.find((seat) => seat.seatLayoutDetailId === id)?.seatNumber ||
          `#${id}`,
      )
      .join(", ");
  }, [selectedSeatIds, seats]);

  const totalAmount =
    selectedSeatIds.length * Number(preview.data?.ticketPrice ?? 0);

  if (!open) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSelectTrip = (nextTripId: number) => {
    setTripId(String(nextTripId));
    setPickupPointId("");
    setDropoffPointId("");
    setPickupSearch("");
    setDropoffSearch("");
    setSelectedSeatIds([]);
  };

  const toggleSeat = (seat: AdminOfflineTripSeat) => {
    if (seat.seatStatus !== "AVAILABLE") {
      toast.error(
        seat.seatStatus === "BOOKED"
          ? "Ghế này đã bán."
          : "Ghế này đang được giữ.",
      );
      return;
    }

    setSelectedSeatIds((current) =>
      current.includes(seat.seatLayoutDetailId)
        ? current.filter((id) => id !== seat.seatLayoutDetailId)
        : [...current, seat.seatLayoutDetailId],
    );
  };

  const getGridDimensions = (floorSeats: AdminOfflineTripSeat[]) => {
    let maxRow = 0;
    let maxCol = 0;

    floorSeats.forEach((seat) => {
      maxRow = Math.max(maxRow, seat.rowNo);
      maxCol = Math.max(maxCol, seat.columnNo);
    });

    return { maxRow, maxCol };
  };

  const getVehicleLayoutName = () => {
    if (preview.data?.vehicleTypeName) return preview.data.vehicleTypeName;

    const totalSeats = preview.data?.totalSeats ?? seats.length;
    const maxFloor = Math.max(1, ...seats.map((s) => s.floorNo ?? 1));

    if (totalSeats === 9) return "Limousine 9 chỗ";
    if (totalSeats === 19) return "Limousine 19 chỗ";
    if (totalSeats === 40 || (totalSeats >= 35 && maxFloor === 2)) {
      return "Giường nằm 40 chỗ";
    }
    if (totalSeats === 22 && maxFloor === 2) return "Cabin VIP 22 phòng";

    return "Sơ đồ ghế";
  };

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
        <div className={styles.seatCap}></div>

        <div className={styles.seatBody}>
          <strong>{seat.seatNumber}</strong>
          <small>
            {isBooked ? "ĐÃ BÁN" : isHolding ? "ĐANG GIỮ" : "TRỐNG"}
          </small>
        </div>
      </button>
    );
  };

  const renderFloorSeatGrid = (floorSeats: AdminOfflineTripSeat[]) => {
    const { maxRow, maxCol } = getGridDimensions(floorSeats);

    return (
      <div
        className={styles.seatGrid}
        style={{
          // KHÔI PHỤC: Giữ nguyên trục ban đầu của bạn
          gridTemplateRows: `repeat(${maxRow}, 62px)`,
          gridTemplateColumns: `repeat(${maxCol}, 86px)`,
        }}
      >
        {floorSeats.map((seat) => (
          <div
            key={seat.seatLayoutDetailId}
            style={{
              // KHÔI PHỤC: Row ứng với rowNo, Column ứng với columnNo chuẩn ban đầu
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

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!tripId) return toast.error("Vui lòng chọn chuyến xe.");
    if (!validateCustomer()) return;

    if (selectedSeatIds.length === 0) {
      return toast.error("Vui lòng chọn ít nhất một ghế trên sơ đồ.");
    }

    onSubmit({
      tripId: Number(tripId),
      passengerName: passengerName.trim(),
      passengerPhone: passengerPhone.trim(),
      passengerEmail: passengerEmail.trim() || null,
      pickupPointId: pickupPointId ? Number(pickupPointId) : null,
      dropoffPointId: dropoffPointId ? Number(dropoffPointId) : null,
      seatLayoutDetailIds: selectedSeatIds,
      paid,
    });
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.largeModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>Lập vé tại quầy</h2>
            <p>
              Chọn chuyến, tự tải sơ đồ ghế, nhập thông tin khách và tạo vé
              offline.
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
          <div className={styles.workflowRowSplit}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>1</span>
                <h3>Chọn chuyến xe</h3>
              </div>

              <div className={styles.filterFieldsGrid}>
                <label className={styles.formLabel}>
                  <span>Ngày khởi hành</span>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => {
                      setTargetDate(e.target.value);
                      setVehicleTypeFilter("");
                      setTripId("");
                      setSelectedSeatIds([]);
                    }}
                  />
                </label>
                <label className={styles.formLabel}>
                  <span>Loại xe</span>
                  <select
                    value={vehicleTypeFilter}
                    onChange={(e) => {
                      setVehicleTypeFilter(e.target.value);
                      setTripId("");
                      setSelectedSeatIds([]);
                    }}
                  >
                    <option value="">Tất cả loại xe</option>

                    {vehicleTypeOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formLabel}>
                  <span>Tìm chuyến</span>
                  <input
                    value={tripSearch}
                    onChange={(e) => setTripSearch(e.target.value)}
                    placeholder="Mã chuyến, tuyến, loại xe, tên xe, biển số..."
                  />
                </label>
              </div>

              <div className={styles.tripList}>
                {filteredTrips.map((trip) => {
                  const active = tripId === String(trip.tripId);

                  return (
                    <button
                      key={trip.tripId}
                      type="button"
                      className={`${styles.tripOption} ${
                        active ? styles.tripOptionActive : ""
                      }`}
                      onClick={() => handleSelectTrip(trip.tripId)}
                    >
                      <div className={styles.tripMeta}>
                        <span className={styles.tripIdTag}>#{trip.tripId}</span>
                        <span className={styles.vehicleTypeTag}>
                          {trip.vehicleTypeName || "Chưa gán loại xe"}
                        </span>
                      </div>

                      <div className={styles.tripNameText}>{trip.tripName}</div>

                      <div className={styles.tripVehicleLine}>
                        <span>{trip.vehicleName || "Chưa gán xe"}</span>
                        <span>{trip.licensePlate || "Chưa có biển số"}</span>
                        <span>
                          {trip.totalSeats
                            ? `${trip.totalSeats} ghế`
                            : "Chưa có sơ đồ"}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {filteredTrips.length === 0 && (
                  <div className={styles.emptyState}>
                    Không tìm thấy chuyến phù hợp.
                  </div>
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>2</span>
                <h3>Thông tin hành khách</h3>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.formLabel}>
                  <span>Họ tên hành khách *</span>
                  <input
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                  />
                </label>

                <label className={styles.formLabel}>
                  <span>Số điện thoại *</span>
                  <input
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    placeholder="Ví dụ: 0912345678"
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

              {preview.data && (
                <div className={styles.selectionSummary}>
                  <span>Giá vé / ghế:</span>
                  <strong className={styles.priceHighlight}>
                    {formatCurrency(preview.data.ticketPrice)}
                  </strong>
                </div>
              )}
            </section>
          </div>

          {tripId && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>3</span>
                <h3>Thông tin chuyến đã chọn</h3>
              </div>

              {preview.isLoading ? (
                <div className={styles.loadingState}>
                  <div className={styles.smallSpinner}></div> Đang tải thông tin
                  chuyến...
                </div>
              ) : preview.data ? (
                <div className={styles.vehicleSummaryBox}>
                  <div className={styles.summaryItem}>
                    <span>Tuyến đường</span>
                    <strong>{preview.data.routeName}</strong>
                  </div>

                  <div className={styles.summaryItem}>
                    <span>Giờ xuất bến</span>
                    <strong>
                      {formatDateTimeVN(preview.data.departureDatetime)}
                    </strong>
                  </div>

                  <div className={styles.summaryItem}>
                    <span>Dòng xe</span>
                    <strong>
                      {preview.data.vehicleTypeName ||
                        selectedTrip?.vehicleTypeName ||
                        "Chưa xác định"}
                    </strong>
                  </div>

                  <div className={styles.summaryItem}>
                    <span>Tên xe / Số hiệu</span>
                    <strong>
                      {preview.data.vehicleName ||
                        selectedTrip?.vehicleName ||
                        "Chưa gán xe"}
                    </strong>
                  </div>

                  <div className={styles.summaryItem}>
                    <span>Biển kiểm soát</span>
                    <strong>
                      {preview.data.licensePlate ||
                        selectedTrip?.licensePlate ||
                        "—"}
                    </strong>
                  </div>

                  <div className={styles.summaryItem}>
                    <span>Tổng số chỗ</span>
                    <strong>
                      {preview.data.totalSeats ||
                        selectedTrip?.totalSeats ||
                        seats.length}{" "}
                      ghế
                    </strong>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  Không tải được thông tin chi tiết của chuyến này.
                </div>
              )}
            </section>
          )}

          <div className={styles.workflowRowSplit}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>4</span>
                <h3>Điểm đón</h3>
              </div>

              <input
                className={styles.searchInput}
                value={pickupSearch}
                onChange={(e) => setPickupSearch(e.target.value)}
                placeholder="Tìm nhanh điểm đón khách..."
                disabled={!tripId}
              />

              <div className={styles.pointList}>
                <button
                  type="button"
                  className={`${styles.pointOption} ${
                    !pickupPointId ? styles.pointOptionActive : ""
                  }`}
                  onClick={() => setPickupPointId("")}
                  disabled={!tripId}
                >
                  <strong>Bến đi mặc định</strong>
                  <span>Theo điểm khởi hành hệ thống của chuyến</span>
                </button>

                {pickupPoints.map((point) => (
                  <button
                    key={point.pickupPointId}
                    type="button"
                    className={`${styles.pointOption} ${
                      pickupPointId === String(point.pickupPointId)
                        ? styles.pointOptionActive
                        : ""
                    }`}
                    onClick={() =>
                      setPickupPointId(String(point.pickupPointId))
                    }
                  >
                    <strong>{point.pointName}</strong>
                    <span>{point.address || point.zoneName || "—"}</span>
                  </button>
                ))}

                {tripId && pickupPoints.length === 0 && (
                  <div className={styles.emptyState}>
                    Không tìm thấy điểm đón phù hợp.
                  </div>
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepIndicator}>5</span>
                <h3>Điểm trả</h3>
              </div>

              <input
                className={styles.searchInput}
                value={dropoffSearch}
                onChange={(e) => setDropoffSearch(e.target.value)}
                placeholder="Tìm nhanh điểm trả khách..."
                disabled={!tripId}
              />

              <div className={styles.pointList}>
                <button
                  type="button"
                  className={`${styles.pointOption} ${
                    !dropoffPointId ? styles.pointOptionActive : ""
                  }`}
                  onClick={() => setDropoffPointId("")}
                  disabled={!tripId}
                >
                  <strong>Bến đến mặc định</strong>
                  <span>Theo điểm kết thúc hệ thống của chuyến</span>
                </button>

                {dropoffPoints.map((point) => (
                  <button
                    key={point.pickupPointId}
                    type="button"
                    className={`${styles.pointOption} ${
                      dropoffPointId === String(point.pickupPointId)
                        ? styles.pointOptionActive
                        : ""
                    }`}
                    onClick={() =>
                      setDropoffPointId(String(point.pickupPointId))
                    }
                  >
                    <strong>{point.pointName}</strong>
                    <span>{point.address || point.zoneName || "—"}</span>
                  </button>
                ))}

                {tripId && dropoffPoints.length === 0 && (
                  <div className={styles.emptyState}>
                    Không tìm thấy điểm trả phù hợp.
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.stepIndicator}>6</span>
              <h3>Sơ đồ ghế ngồi & Giường nằm</h3>
            </div>

            <div className={styles.seatLegendBar}>
              <div className={styles.legendItem}>
                <span className={`${styles.legendBox} ${styles.bgAvailable}`} />
                <span>Trống</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendBox} ${styles.bgSelected}`} />
                <span>Đang chọn</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendBox} ${styles.bgBooked}`} />
                <span>Đã bán</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendBox} ${styles.bgHolding}`} />
                <span>Đang giữ chỗ</span>
              </div>
            </div>

            {preview.isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.smallSpinner}></div> Đang dựng sơ đồ
                ghế...
              </div>
            ) : !tripId ? (
              <div className={styles.emptyState}>
                Vui lòng chọn chuyến đi tại bước 1 để hiển thị sơ đồ.
              </div>
            ) : seats.length === 0 ? (
              <div className={styles.emptyState}>
                Chuyến xe này chưa được cấu hình sơ đồ vị trí.
              </div>
            ) : (
              <div className={styles.floorList}>
                {Object.entries(floors).map(([floorNo, floorSeats]) => (
                  <div key={floorNo} className={styles.floorCard}>
                    <div className={styles.floorTitle}>
                      {getVehicleLayoutName()} — Tầng {floorNo}
                    </div>

                    <div className={styles.busCabin}>
                      <div className={styles.busFront}>
                        <div className={styles.busDoor}>CỬA LÊN ▲</div>
                        <div className={styles.driverSeat}>
                          <div className={styles.steeringWheel}></div>
                          <span>TÀI XẾ</span>
                        </div>
                      </div>

                      <div className={styles.gridContainer}>
                        {renderFloorSeatGrid(floorSeats)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.selectionSummary}>
              <span>Danh sách vị trí đã chọn:</span>
              <strong className={styles.seatsHighlight}>
                {selectedSeatNames || "Chưa chọn vị trí"}
              </strong>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.stepIndicator}>7</span>
              <h3>Xác nhận & Thu tiền</h3>
            </div>

            <div className={styles.previewGrid}>
              <div className={styles.kpiCard}>
                <span>Tổng lượng ghế</span>
                <strong>{selectedSeatIds.length} vé</strong>
              </div>

              <div className={styles.kpiCard}>
                <span>Tổng tiền phải thanh toán</span>
                <strong className={styles.totalPriceHighlight}>
                  {formatCurrency(totalAmount)}
                </strong>
              </div>

              <div className={styles.kpiCard}>
                <span>Mã chuyến chỉ định</span>
                <strong>{tripId ? `#${tripId}` : "Chưa chọn"}</strong>
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
                  <strong>Đã hoàn thành thu tiền khách hàng</strong>
                  <p>
                    Đánh dấu nếu khách đã trả tiền mặt hoặc chuyển khoản tại
                    quầy. Nếu bỏ chọn, vé lưu ở dạng "Chờ thanh toán".
                  </p>
                </div>
              </label>
            </div>
          </section>

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
              disabled={loading}
            >
              {loading ? "Đang xử lý xuất vé..." : "Xác nhận tạo vé"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
