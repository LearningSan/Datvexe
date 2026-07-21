"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RotateCcw,
  UserRoundX,
  X,
  XCircle,
} from "lucide-react";

import {
  useUpdatePassengerCheckin,
  useUpdatePassengerContact,
} from "@/hooks/admin/use-checkin-dashboard";

import { getApiErrorMessage } from "@/lib/admin/get-api-error-message";

import type { CheckinDashboardPassengerItem } from "@/types/admin/checkin/checkin-dashboard-passenger.type";

import type {
  PassengerCheckinAction,
  PassengerContactResult,
  PassengerContactType,
} from "@/types/admin/checkin/checkin-operation.type";

import styles from "./PassengerActionModal.module.css";

interface PassengerActionModalProps {
  open: boolean;

  tripId: number;

  passenger: CheckinDashboardPassengerItem | null;

  actionsDisabled?: boolean;
  disabledReason?: string;

  onClose: () => void;
}

const CONTACT_RESULT_OPTIONS: Array<{
  value: PassengerContactResult;
  label: string;
}> = [
  {
    value: "CONTACTED",
    label: "Đã liên hệ",
  },
  {
    value: "COMING",
    label: "Khách đang đến",
  },
  {
    value: "ARRIVING_LATE",
    label: "Khách sẽ đến trễ",
  },
  {
    value: "UNREACHABLE",
    label: "Không liên lạc được",
  },
  {
    value: "CANCEL_REQUESTED",
    label: "Khách yêu cầu hủy",
  },
];

const CONTACT_TYPE_OPTIONS: Array<{
  value: PassengerContactType;
  label: string;
}> = [
  {
    value: "PHONE_CALL",
    label: "Gọi điện thoại",
  },
  {
    value: "IN_APP_NOTIFICATION",
    label: "Thông báo trong ứng dụng",
  },
  {
    value: "EMAIL",
    label: "Email",
  },
  {
    value: "MANUAL",
    label: "Ghi nhận thủ công",
  },
];
function toDatetimeLocal(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getActionTitle(action: PassengerCheckinAction): string {
  switch (action) {
    case "UNDO_CHECK_IN":
      return "Hoàn tác check-in";

    case "NO_SHOW":
      return "Đánh dấu hành khách vắng mặt";

    case "REJECT":
      return "Từ chối hành khách lên xe";

    case "CHECK_IN":
      return "Xác nhận check-in";
  }
}

function getActionDescription(action: PassengerCheckinAction): string {
  switch (action) {
    case "UNDO_CHECK_IN":
      return "Trạng thái ghế sẽ được đưa về chưa check-in và hành khách có thể được check-in lại.";

    case "NO_SHOW":
      return "Hành khách sẽ được ghi nhận không có mặt tại thời điểm xe chuẩn bị khởi hành.";

    case "REJECT":
      return "Hành khách sẽ bị từ chối lên xe. Hãy kiểm tra kỹ thông tin trước khi tiếp tục.";

    case "CHECK_IN":
      return "Xác nhận hành khách đã có mặt và đủ điều kiện lên xe.";
  }
}

function getActionConfirmText(action: PassengerCheckinAction): string {
  switch (action) {
    case "UNDO_CHECK_IN":
      return "Xác nhận hoàn tác";

    case "NO_SHOW":
      return "Xác nhận no-show";

    case "REJECT":
      return "Xác nhận từ chối";

    case "CHECK_IN":
      return "Xác nhận check-in";
  }
}

function getActionSuccessMessage(action: PassengerCheckinAction): string {
  switch (action) {
    case "CHECK_IN":
      return "Check-in hành khách thành công.";

    case "UNDO_CHECK_IN":
      return "Đã hoàn tác check-in.";

    case "NO_SHOW":
      return "Đã đánh dấu hành khách no-show.";

    case "REJECT":
      return "Đã từ chối hành khách lên xe.";
  }
}

export default function PassengerActionModal({
  open,
  tripId,
  passenger,
  actionsDisabled = false,
  disabledReason,
  onClose,
}: PassengerActionModalProps) {
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkinMutation = useUpdatePassengerCheckin();

  const contactMutation = useUpdatePassengerContact();

  const [pendingCheckinAction, setPendingCheckinAction] =
    useState<PassengerCheckinAction | null>(null);
  const [checkinNote, setCheckinNote] = useState("");

  const [contactType, setContactType] =
    useState<PassengerContactType>("PHONE_CALL");

  const [contactResult, setContactResult] =
    useState<PassengerContactResult>("CONTACTED");

  const [expectedArrivalAt, setExpectedArrivalAt] = useState("");

  const [contactNote, setContactNote] = useState("");

  useEffect(() => {
    if (!passenger) {
      return;
    }

    setCheckinNote(passenger.checkin.note ?? "");

    setContactType("PHONE_CALL");

    switch (passenger.contact.status) {
      case "CONTACTED":
        setContactResult("CONTACTED");
        break;

      case "COMING":
        setContactResult("COMING");
        break;

      case "ARRIVING_LATE":
        setContactResult("ARRIVING_LATE");
        break;

      case "UNREACHABLE":
        setContactResult("UNREACHABLE");
        break;

      case "CANCEL_REQUESTED":
        setContactResult("CANCEL_REQUESTED");
        break;

      case "NOT_CONTACTED":
      case "NOTIFIED":
      default:
        setContactResult("CONTACTED");
        break;
    }

    setExpectedArrivalAt(toDatetimeLocal(passenger.contact.expectedArrivalAt));

    setContactNote(passenger.contact.note ?? "");

    setPendingCheckinAction(null);
  }, [passenger]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (!open || !passenger) {
    return null;
  }
  const currentPassenger = passenger;
  const isSubmitting = checkinMutation.isPending || contactMutation.isPending;

  const checkinActionDisabled = isSubmitting || actionsDisabled;

  function closeAfterSuccess() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 700);
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    if (pendingCheckinAction) {
      setPendingCheckinAction(null);
      return;
    }

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    onClose();
  }
  async function submitCheckinAction(action: PassengerCheckinAction) {
    if (actionsDisabled) {
      toast.error("Không thể thao tác check-in với chuyến này.");
      return;
    }
    if (
      action === "UNDO_CHECK_IN" ||
      action === "NO_SHOW" ||
      action === "REJECT"
    ) {
      setPendingCheckinAction(action);
      return;
    }

    await executeCheckinAction(action);
  }
  async function executeCheckinAction(action: PassengerCheckinAction) {
    try {
      const result = await checkinMutation.mutateAsync({
        bookingSeatId: currentPassenger.bookingSeatId,
        action,
        note: checkinNote.trim() || undefined,
      });

      setPendingCheckinAction(null);

      toast.success(result.message?.trim() || getActionSuccessMessage(action));

      closeAfterSuccess();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Không thể cập nhật trạng thái check-in."),
      );
    }
  }
  async function submitContact() {
    if (contactResult === "ARRIVING_LATE" && !expectedArrivalAt) {
      toast.error("Vui lòng nhập thời gian khách dự kiến đến.");
      return;
    }

    if (contactResult === "CANCEL_REQUESTED" && !contactNote.trim()) {
      toast.error("Vui lòng nhập lý do khách yêu cầu hủy vé.");
      return;
    }

    try {
      await contactMutation.mutateAsync({
        bookingId: currentPassenger.bookingId,
        tripId,

        contactType,
        contactResult,

        expectedArrivalAt:
          contactResult === "ARRIVING_LATE" && expectedArrivalAt
            ? new Date(expectedArrivalAt).toISOString()
            : null,

        note: contactNote.trim() || null,
      });

      toast.success("Đã cập nhật trạng thái liên hệ.");

      closeAfterSuccess();
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Không thể cập nhật trạng thái liên hệ."),
      );
    }
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          handleClose();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="passenger-action-title"
      >
        <header className={styles.header}>
          <div>
            <h2 id="passenger-action-title">Thao tác hành khách</h2>

            <p>
              Ghế {passenger.seatNumber} · {passenger.passenger.name}
            </p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </header>

        <div className={styles.passengerInfo}>
          <div>
            <span>Mã đặt vé</span>

            <strong>{passenger.bookingCode}</strong>
          </div>

          <div>
            <span>Số điện thoại</span>

            <a
              href={`tel:${passenger.passenger.phone}`}
              className={styles.phoneLink}
            >
              {passenger.passenger.phone}
            </a>
          </div>

          <div>
            <span>Check-in</span>

            <strong>{passenger.checkin.status}</strong>
          </div>

          <div>
            <span>Cảnh báo</span>

            <strong>{passenger.alert.level}</strong>
          </div>
        </div>

        <div className={styles.section}>
          <h3>Thao tác check-in</h3>

          {actionsDisabled && (
            <div className={styles.disabledNotice}>
              <AlertTriangle size={17} />

              <span>
                {disabledReason ??
                  "Không thể thao tác check-in với chuyến này."}
              </span>
            </div>
          )}

          <label className={styles.field}>
            <span>Ghi chú check-in</span>

            <textarea
              value={checkinNote}
              onChange={(event) => setCheckinNote(event.target.value)}
              rows={3}
              maxLength={255}
              disabled={checkinActionDisabled}
              placeholder="Nhập ghi chú nếu có..."
            />
          </label>

          <div className={styles.actionGrid}>
            {passenger.checkin.status !== "CHECKED_IN" && (
              <button
                type="button"
                className={styles.successButton}
                disabled={checkinActionDisabled}
                onClick={() => void submitCheckinAction("CHECK_IN")}
              >
                {checkinMutation.isPending ? (
                  <LoaderCircle size={17} className={styles.spinning} />
                ) : (
                  <CheckCircle2 size={17} />
                )}
                Check-in
              </button>
            )}

            {passenger.checkin.status === "CHECKED_IN" && (
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={checkinActionDisabled}
                onClick={() => void submitCheckinAction("UNDO_CHECK_IN")}
              >
                {checkinMutation.isPending ? (
                  <LoaderCircle size={17} className={styles.spinning} />
                ) : (
                  <RotateCcw size={17} />
                )}
                Hoàn tác
              </button>
            )}

            {passenger.checkin.status !== "NO_SHOW" && (
              <button
                type="button"
                className={styles.warningButton}
                disabled={checkinActionDisabled}
                onClick={() => void submitCheckinAction("NO_SHOW")}
              >
                {checkinMutation.isPending ? (
                  <LoaderCircle size={17} className={styles.spinning} />
                ) : (
                  <Clock3 size={17} />
                )}
                No-show
              </button>
            )}

            {passenger.checkin.status !== "REJECTED" && (
              <button
                type="button"
                className={styles.dangerButton}
                disabled={checkinActionDisabled}
                onClick={() => void submitCheckinAction("REJECT")}
              >
                {checkinMutation.isPending ? (
                  <LoaderCircle size={17} className={styles.spinning} />
                ) : (
                  <UserRoundX size={17} />
                )}
                Từ chối lên xe
              </button>
            )}
          </div>
        </div>
        {pendingCheckinAction && (
          <div
            className={`${styles.actionConfirmBox} ${
              pendingCheckinAction === "REJECT"
                ? styles.actionConfirmDanger
                : pendingCheckinAction === "NO_SHOW"
                  ? styles.actionConfirmWarning
                  : styles.actionConfirmSecondary
            }`}
          >
            <div className={styles.actionConfirmHeader}>
              <div className={styles.actionConfirmIcon}>
                {pendingCheckinAction === "REJECT" ? (
                  <UserRoundX size={23} />
                ) : pendingCheckinAction === "NO_SHOW" ? (
                  <Clock3 size={23} />
                ) : (
                  <RotateCcw size={23} />
                )}
              </div>

              <div>
                <span>Xác nhận thao tác</span>
                <h3>{getActionTitle(pendingCheckinAction)}</h3>
              </div>
            </div>

            <p className={styles.actionConfirmDescription}>
              {getActionDescription(pendingCheckinAction)}
            </p>

            <div className={styles.actionConfirmPassenger}>
              <div>
                <span>Hành khách</span>
                <strong>{currentPassenger.passenger.name}</strong>
              </div>

              <div>
                <span>Ghế</span>
                <strong>{currentPassenger.seatNumber}</strong>
              </div>

              <div>
                <span>Mã đặt vé</span>
                <strong>{currentPassenger.bookingCode}</strong>
              </div>
            </div>

            {checkinNote.trim() && (
              <div className={styles.actionConfirmNote}>
                <span>Ghi chú check-in</span>
                <p>{checkinNote.trim()}</p>
              </div>
            )}

            <div className={styles.actionConfirmActions}>
              <button
                type="button"
                className={styles.actionConfirmCancel}
                disabled={checkinMutation.isPending}
                onClick={() => setPendingCheckinAction(null)}
              >
                Quay lại
              </button>

              <button
                type="button"
                className={
                  pendingCheckinAction === "REJECT"
                    ? styles.actionConfirmSubmitDanger
                    : pendingCheckinAction === "NO_SHOW"
                      ? styles.actionConfirmSubmitWarning
                      : styles.actionConfirmSubmitSecondary
                }
                disabled={checkinMutation.isPending}
                onClick={() => void executeCheckinAction(pendingCheckinAction)}
              >
                {checkinMutation.isPending ? (
                  <LoaderCircle size={17} className={styles.spinning} />
                ) : pendingCheckinAction === "REJECT" ? (
                  <UserRoundX size={17} />
                ) : pendingCheckinAction === "NO_SHOW" ? (
                  <Clock3 size={17} />
                ) : (
                  <RotateCcw size={17} />
                )}

                {checkinMutation.isPending
                  ? "Đang xử lý..."
                  : getActionConfirmText(pendingCheckinAction)}
              </button>
            </div>
          </div>
        )}
        <div className={styles.section}>
          <h3>Liên hệ hành khách</h3>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              {" "}
              <span>Hình thức liên hệ</span>
              <select
                value={contactType}
                disabled={isSubmitting}
                onChange={(event) =>
                  setContactType(event.target.value as PassengerContactType)
                }
              >
                {CONTACT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {" "}
                    {option.label}{" "}
                  </option>
                ))}
              </select>{" "}
            </label>{" "}
            <label className={styles.field}>
              <span>Kết quả liên hệ</span>
              <select
                value={contactResult}
                disabled={isSubmitting}
                onChange={(event) => {
                  const value = event.target.value as PassengerContactResult;
                  setContactResult(value);
                  if (value !== "ARRIVING_LATE") {
                    setExpectedArrivalAt("");
                  }
                }}
              >
                {CONTACT_RESULT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {" "}
                    {option.label}
                  </option>
                ))}{" "}
              </select>{" "}
            </label>
          </div>
          {contactResult === "ARRIVING_LATE" && (
            <label className={styles.field}>
              <span>Dự kiến đến</span>

              <input
                type="datetime-local"
                value={expectedArrivalAt}
                disabled={isSubmitting}
                onChange={(event) => setExpectedArrivalAt(event.target.value)}
              />
            </label>
          )}
        </div>
        <div>
          <label className={styles.field}>
            <span>Ghi chú liên hệ</span>

            <textarea
              value={contactNote}
              onChange={(event) => setContactNote(event.target.value)}
              rows={3}
              maxLength={255}
              disabled={isSubmitting}
              placeholder="Ví dụ: khách báo đang cách bến 5 phút..."
            />
          </label>

          <button
            type="button"
            className={styles.primaryButton}
            disabled={isSubmitting}
            onClick={() => void submitContact()}
          >
            {contactMutation.isPending && (
              <LoaderCircle size={17} className={styles.spinning} />
            )}

            {contactMutation.isPending
              ? "Đang lưu..."
              : "Lưu trạng thái liên hệ"}
          </button>
        </div>
      </section>
    </div>
  );
}
