"use client";

import { useCallback, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Bus,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Mail,
  MapPin,
  QrCode,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";

import {
  useConfirmCheckin,
  useLookupCheckinQr,
} from "@/hooks/admin/useCheckin";

import CheckinQrScanner from "./CheckinQrScanner";

import type {
  AdminCheckinLookupResponse,
  AdminCheckinSeatItem,
  CheckinEligibility,
} from "@/types/admin/checkin/checkin.type";

import { formatCurrency, formatDateTimeVN } from "@/lib/client/helpers";
import styles from "./CheckinContainer.module.css";

export default function CheckinContainer() {
  const [manualQrData, setManualQrData] = useState("");
  const [lastScannedValue, setLastScannedValue] = useState("");
  const [booking, setBooking] = useState<AdminCheckinLookupResponse | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [isCheckinConfirmOpen, setIsCheckinConfirmOpen] = useState(false);

  const lookupMutation = useLookupCheckinQr();
  const confirmMutation = useConfirmCheckin();

  const canConfirm =
    booking?.eligibility === "ELIGIBLE" &&
    selectedSeatIds.length > 0 &&
    !confirmMutation.isPending;

  const lookupQr = useCallback(
    (rawValue: string) => {
      const qrData = rawValue.trim();

      if (!qrData) {
        toast.error("Vui lòng quét hoặc nhập dữ liệu QR.");
        return;
      }

      if (lookupMutation.isPending) {
        return;
      }

      setManualQrData(qrData);

      lookupMutation.mutate(
        { qrData },
        {
          onSuccess: (data) => {
            setBooking(data);
            setLastScannedValue(qrData);

            const eligibleSeatIds = data.seats
              .filter((seat) => seat.canCheckin)
              .map((seat) => seat.bookingSeatId);

            setSelectedSeatIds(eligibleSeatIds);

            if (data.eligibility === "ELIGIBLE") {
              toast.success("Vé hợp lệ, có thể check-in.");
            } else {
              toast.error(data.eligibilityMessage);
            }
          },
          onError: (error) => {
            setBooking(null);
            setSelectedSeatIds([]);
            toast.error(getErrorMessage(error, "Không thể kiểm tra mã QR."));
          },
        }
      );
    },
    [lookupMutation]
  );

  function handleManualLookup() {
    lookupQr(manualQrData);
  }

  function handleSeatToggle(seat: AdminCheckinSeatItem) {
    if (!seat.canCheckin) return;

    setSelectedSeatIds((current) => {
      if (current.includes(seat.bookingSeatId)) {
        return current.filter((id) => id !== seat.bookingSeatId);
      }
      return [...current, seat.bookingSeatId];
    });
  }

  function handleSelectAllEligible() {
    if (!booking) return;

    setSelectedSeatIds(
      booking.seats
        .filter((seat) => seat.canCheckin)
        .map((seat) => seat.bookingSeatId)
    );
  }

  function handleClearSelection() {
    setSelectedSeatIds([]);
  }

  function handleConfirmCheckin() {
    if (!booking) return;

    if (booking.eligibility !== "ELIGIBLE") {
      toast.error(booking.eligibilityMessage);
      return;
    }

    if (!selectedSeatIds.length) {
      toast.error("Vui lòng chọn ít nhất một ghế.");
      return;
    }

    setIsCheckinConfirmOpen(true);
  }

  function handleSubmitCheckin() {
    if (!booking || !selectedSeatIds.length) return;

    confirmMutation.mutate(
      {
        bookingId: booking.bookingId,
        bookingSeatIds: selectedSeatIds,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          setIsCheckinConfirmOpen(false);

          if (result.checkedInCount > 0) {
            toast.success(`Check-in thành công ${result.checkedInCount} ghế.`);
          } else {
            toast.success("Các ghế đã được check-in trước đó.");
          }

          // Tự động tải lại thông tin mới nhất của vé vừa quét
          lookupMutation.mutate(
            { qrData: lastScannedValue },
            {
              onSuccess: (data) => {
                setBooking(data);
                setSelectedSeatIds(
                  data.seats
                    .filter((seat) => seat.canCheckin)
                    .map((seat) => seat.bookingSeatId)
                );
              },
            }
          );
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, "Không thể xác nhận check-in."));
        },
      }
    );
  }

  function handleReset() {
    setBooking(null);
    setSelectedSeatIds([]);
    setManualQrData("");
    setLastScannedValue("");
    setNote("");
    setIsCheckinConfirmOpen(false);
  }

  return (
    <div className={styles.dashboard}>
      <Toaster position="top-right" />

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Quản lý hành khách</span>
          <h1>Check-in hành khách</h1>
          <p>
            Quét mã QR vé điện tử, kiểm tra thông tin hành khách và xác nhận
            từng ghế trước khi lên xe.
          </p>
        </div>
      </header>

      <section className={styles.workspace}>
        <div className={styles.scannerColumn}>
          {/* Component QR tự quản lý đóng mở camera */}
          <CheckinQrScanner
            onDetected={(value) => {
              if (value === lastScannedValue && booking) return;
              lookupQr(value);
            }}
          />

          <div className={styles.manualCard}>
            <div className={styles.manualHeader}>
              <div>
                <h2>Nhập mã thủ công</h2>
                <p>
                  Dùng khi camera không đọc được QR hoặc khách chỉ cung cấp dữ liệu vé.
                </p>
              </div>
              <QrCode size={22} />
            </div>

            <div className={styles.manualInput}>
              <textarea
                value={manualQrData}
                onChange={(event) => setManualQrData(event.target.value)}
                placeholder='Dán nội dung QR, ví dụ {"type":"CHECKIN",...}'
                rows={4}
              />

              <button
                type="button"
                onClick={handleManualLookup}
                disabled={lookupMutation.isPending}
              >
                <Search size={18} />
                {lookupMutation.isPending ? "Đang kiểm tra..." : "Kiểm tra vé"}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.resultColumn}>
          {!booking && !lookupMutation.isPending && <EmptyCheckinState />}

          {lookupMutation.isPending && (
            <div className={styles.stateCard}>
              <RefreshCw size={42} className={styles.spinIcon} />
              <h2>Đang kiểm tra vé</h2>
              <p>Hệ thống đang xác minh chữ ký QR và thông tin booking.</p>
            </div>
          )}

          {booking && (
            <CheckinBookingPanel
              booking={booking}
              selectedSeatIds={selectedSeatIds}
              note={note}
              isConfirming={confirmMutation.isPending}
              canConfirm={canConfirm}
              onNoteChange={setNote}
              onSeatToggle={handleSeatToggle}
              onSelectAll={handleSelectAllEligible}
              onClearSelection={handleClearSelection}
              onConfirm={handleConfirmCheckin}
              onReset={handleReset}
            />
          )}
        </div>
      </section>

      {isCheckinConfirmOpen && booking && (
        <div
          className={styles.checkinConfirmOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !confirmMutation.isPending) {
              setIsCheckinConfirmOpen(false);
            }
          }}
        >
          <div
            className={styles.checkinConfirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkin-confirm-title"
          >
            <div className={styles.checkinConfirmHeader}>
              <div className={styles.checkinConfirmIcon}>
                <CheckCircle2 size={29} />
              </div>
              <div>
                <span>Check-in hành khách</span>
                <h2 id="checkin-confirm-title">Xác nhận hành khách lên xe</h2>
              </div>
              <button
                type="button"
                className={styles.checkinConfirmClose}
                disabled={confirmMutation.isPending}
                onClick={() => setIsCheckinConfirmOpen(false)}
                aria-label="Đóng hộp thoại"
              >
                ×
              </button>
            </div>

            <div className={styles.checkinConfirmBody}>
              <p className={styles.checkinConfirmDescription}>
                Kiểm tra thông tin hành khách và danh sách ghế trước khi xác nhận check-in.
              </p>

              <div className={styles.checkinConfirmPassenger}>
                <div className={styles.checkinConfirmAvatar}>
                  <UserRound size={25} />
                </div>
                <div>
                  <span>Hành khách</span>
                  <strong>{booking.passengerName}</strong>
                  <small>{booking.passengerPhone}</small>
                </div>
              </div>

              <div className={styles.checkinConfirmInfo}>
                <div>
                  <span>Mã đặt vé</span>
                  <strong>{booking.bookingCode}</strong>
                </div>
                <div>
                  <span>Tuyến xe</span>
                  <strong>{booking.routeName}</strong>
                </div>
                <div>
                  <span>Khởi hành</span>
                  <strong>{formatDateTimeVN(booking.departureDatetime)}</strong>
                </div>
                <div>
                  <span>Phương tiện</span>
                  <strong>
                    {booking.vehicleName
                      ? `${booking.vehicleName}${
                          booking.licensePlate ? ` • ${booking.licensePlate}` : ""
                        }`
                      : "Chưa phân xe"}
                  </strong>
                </div>
              </div>

              <div className={styles.checkinConfirmSeats}>
                <div className={styles.checkinConfirmSeatsHeader}>
                  <div>
                    <span>Ghế được chọn</span>
                    <strong>{selectedSeatIds.length} ghế</strong>
                  </div>
                  <Check size={20} />
                </div>
                <div className={styles.checkinConfirmSeatList}>
                  {booking.seats
                    .filter((seat) => selectedSeatIds.includes(seat.bookingSeatId))
                    .map((seat) => (
                      <span key={seat.bookingSeatId}>{seat.seatNumber}</span>
                    ))}
                </div>
              </div>

              {note.trim() && (
                <div className={styles.checkinConfirmNote}>
                  <span>Ghi chú check-in</span>
                  <p>{note.trim()}</p>
                </div>
              )}

              <div className={styles.checkinConfirmNotice}>
                <CircleAlert size={20} />
                <p>
                  Sau khi xác nhận, các ghế trên sẽ chuyển sang trạng thái{" "}
                  <strong>Đã check-in</strong>.
                </p>
              </div>
            </div>

            <div className={styles.checkinConfirmActions}>
              <button
                type="button"
                className={styles.checkinConfirmCancelButton}
                disabled={confirmMutation.isPending}
                onClick={() => setIsCheckinConfirmOpen(false)}
              >
                Quay lại kiểm tra
              </button>

              <button
                type="button"
                className={styles.checkinConfirmSubmitButton}
                disabled={confirmMutation.isPending}
                onClick={handleSubmitCheckin}
              >
                <CheckCircle2 size={19} />
                {confirmMutation.isPending
                  ? "Đang check-in..."
                  : `Xác nhận ${selectedSeatIds.length} ghế`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckinBookingPanel({
  booking,
  selectedSeatIds,
  note,
  isConfirming,
  canConfirm,
  onNoteChange,
  onSeatToggle,
  onSelectAll,
  onClearSelection,
  onConfirm,
  onReset,
}: {
  booking: AdminCheckinLookupResponse;
  selectedSeatIds: number[];
  note: string;
  isConfirming: boolean;
  canConfirm: boolean;
  onNoteChange: (value: string) => void;
  onSeatToggle: (seat: AdminCheckinSeatItem) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onConfirm: () => void;
  onReset: () => void;
}) {
  const eligibilityClass = getEligibilityClass(booking.eligibility, styles);
  const eligibleSeatCount = useMemo(
    () => booking.seats.filter((seat) => seat.canCheckin).length,
    [booking.seats]
  );

  return (
    <section className={styles.bookingCard}>
      <div className={styles.bookingHeader}>
        <div>
          <span>Mã đặt vé</span>
          <h2>{booking.bookingCode}</h2>
        </div>
        <div className={`${styles.eligibilityBadge} ${eligibilityClass}`}>
          {getEligibilityLabel(booking.eligibility)}
        </div>
      </div>

      <div className={`${styles.eligibilityMessage} ${eligibilityClass}`}>
        {booking.eligibility === "ELIGIBLE" ? (
          <CheckCircle2 size={21} />
        ) : (
          <CircleAlert size={21} />
        )}
        <span>{booking.eligibilityMessage}</span>
      </div>

      <div className={styles.infoGrid}>
        <InfoItem
          icon={<UserRound size={18} />}
          label="Hành khách"
          value={booking.passengerName}
          subValue={booking.passengerPhone}
        />
        <InfoItem
          icon={<Mail size={18} />}
          label="Email"
          value={booking.passengerEmail || "Chưa cập nhật"}
        />
        <InfoItem
          icon={<Bus size={18} />}
          label="Tuyến xe"
          value={booking.routeName}
          subValue={`Chuyến #${booking.tripId}`}
        />
        <InfoItem
          icon={<Clock3 size={18} />}
          label="Khởi hành"
          value={formatDateTimeVN(booking.departureDatetime)}
          subValue={
            booking.vehicleName
              ? `${booking.vehicleName}${
                  booking.licensePlate ? ` • ${booking.licensePlate}` : ""
                }`
              : "Chưa phân xe"
          }
        />
        <InfoItem
          icon={<MapPin size={18} />}
          label="Điểm đón"
          value={booking.pickupPointName || "Chưa cập nhật"}
          subValue={booking.pickupPointAddress || undefined}
        />
        <InfoItem
          icon={<MapPin size={18} />}
          label="Điểm trả"
          value={booking.dropoffPointName || "Chưa cập nhật"}
          subValue={booking.dropoffPointAddress || undefined}
        />
      </div>

      <div className={styles.statGrid}>
        <CheckinStat label="Tổng số ghế" value={booking.totalSeats} />
        <CheckinStat label="Đã check-in" value={booking.checkedInSeats} />
        <CheckinStat label="Còn lại" value={booking.remainingSeats} />
      </div>

      <div className={styles.seatSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Danh sách ghế</h3>
            <p>Chọn các ghế của hành khách đã có mặt tại điểm lên xe.</p>
          </div>
          {eligibleSeatCount > 0 && (
            <div className={styles.selectionActions}>
              <button type="button" onClick={onSelectAll}>
                Chọn tất cả
              </button>
              <button type="button" onClick={onClearSelection}>
                Bỏ chọn
              </button>
            </div>
          )}
        </div>

        <div className={styles.seatGrid}>
          {booking.seats.map((seat) => {
            const selected = selectedSeatIds.includes(seat.bookingSeatId);

            return (
              <button
                key={seat.bookingSeatId}
                type="button"
                disabled={!seat.canCheckin}
                className={`${styles.seatCard} ${
                  seat.checkinStatus === "CHECKED_IN"
                    ? styles.seatCheckedIn
                    : seat.checkinStatus === "NO_SHOW"
                      ? styles.seatNoShow
                      : seat.checkinStatus === "REJECTED"
                        ? styles.seatRejected
                        : selected
                          ? styles.seatSelected
                          : styles.seatAvailable
                }`}
                onClick={() => onSeatToggle(seat)}
              >
                <div className={styles.seatTop}>
                  <strong>{seat.seatNumber}</strong>
                  {selected && seat.canCheckin && (
                    <span className={styles.selectedIcon}>
                      <Check size={15} />
                    </span>
                  )}
                </div>
                <span>{getSeatStatusLabel(seat)}</span>
                <small>{formatCurrency(seat.seatPrice)}</small>
                {seat.checkedInAt && (
                  <small>{formatDateTimeVN(seat.checkedInAt)}</small>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <label className={styles.noteField}>
        <span>Ghi chú check-in</span>
        <textarea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          maxLength={255}
          rows={3}
          placeholder="Ví dụ: Khách có hành lý lớn, lên tại điểm đón khác..."
          disabled={booking.eligibility !== "ELIGIBLE"}
        />
        <small>{note.length}/255 ký tự</small>
      </label>

      <div className={styles.actions}>
        <button type="button" className={styles.resetButton} onClick={onReset}>
          Quét vé khác
        </button>

        <button
          type="button"
          className={styles.confirmButton}
          onClick={onConfirm}
          disabled={!canConfirm}
        >
          <CheckCircle2 size={19} />
          {isConfirming
            ? "Đang xác nhận..."
            : `Xác nhận check-in (${selectedSeatIds.length})`}
        </button>
      </div>
    </section>
  );
}

function InfoItem({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <article className={styles.infoItem}>
      <div className={styles.infoIcon}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {subValue && <small>{subValue}</small>}
      </div>
    </article>
  );
}

function CheckinStat({ label, value }: { label: string; value: number }) {
  return (
    <article className={styles.statCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}


function EmptyCheckinState() {
  return (
    <section className={styles.stateCard}>
      <div className={styles.emptyIcon}>
        <QrCode size={36} />
      </div>
      <h2>Chưa có vé được quét</h2>
      <p>
        Sử dụng camera hoặc nhập mã thủ công ở khung bên trái để tra cứu dữ liệu check-in.
      </p>
    </section>
  );
}

function getSeatStatusLabel(seat: AdminCheckinSeatItem) {
  switch (seat.checkinStatus) {
    case "CHECKED_IN":
      return "Đã check-in";
    case "NO_SHOW":
      return "Không có mặt";
    case "REJECTED":
      return "Bị từ chối";
    default:
      return seat.canCheckin ? "Chưa check-in" : "Không thể check-in";
  }
}

function getEligibilityLabel(eligibility: CheckinEligibility) {
  switch (eligibility) {
    case "ELIGIBLE":
      return "Vé hợp lệ";
    case "ALREADY_CHECKED_IN":
      return "Đã check-in";
    case "UNPAID":
      return "Chưa thanh toán";
    case "BOOKING_CANCELLED":
      return "Vé đã hủy";
    case "BOOKING_REFUNDED":
      return "Đã hoàn tiền";
    case "WRONG_TRIP":
      return "Sai chuyến";
    case "TRIP_CANCELLED":
      return "Chuyến đã hủy";
    case "TRIP_COMPLETED":
      return "Chuyến đã hoàn thành";
    case "TOO_EARLY":
      return "Chưa đến giờ";
    case "TOO_LATE":
      return "Quá giờ";
    default:
      return eligibility;
  }
}

function getEligibilityClass(eligibility: CheckinEligibility, classNames: typeof styles) {
  if (eligibility === "ELIGIBLE") return classNames.eligible;
  if (eligibility === "ALREADY_CHECKED_IN") return classNames.information;
  if (eligibility === "TOO_EARLY") return classNames.warning;
  return classNames.invalid;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const value = error as Record<string, any>;
    const apiMessage = value.response?.data?.message;
    if (typeof apiMessage === "string") return apiMessage;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}