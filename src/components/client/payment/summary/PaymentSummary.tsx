"use client";

import React from "react";
import styles from "./PaymentSummary.module.css";
import type { BookingGroupPaymentSummary } from "@/types/client/payment/payment.type";
import { formatCurrency } from "@/lib/client/helpers";

interface Props {
  summary: BookingGroupPaymentSummary;
  totalAmount: number;
}

function Row({
  label,
  value,
  cls,
  sub,
}: {
  label?: string;
  value: React.ReactNode;
  cls?: string;
  sub?: boolean;
}) {
  return (
    <div className={`${styles.row} ${sub ? styles.sub : ""}`}>
      {label}
      <span className={`${styles.val} ${cls ?? ""}`}>{value}</span>
    </div>
  );
}

export default function PaymentSummary({ summary, totalAmount }: Props) {
  if (!summary.bookings || summary.bookings.length === 0) {
    return null;
  }

  const trip = summary.bookings[0];
  const returnTrip = summary.bookings[1];

  return (
    <div className={styles.card}>
      {/* HEADER */}
      <div className={styles.header}>Chi tiết đặt vé</div>

      {/* THÔNG TIN HÀNH KHÁCH */}
      <div className={styles.sectionTitle}>Thông tin hành khách</div>

      <Row label="Hành khách" value={trip.passengerName} />
      <Row label="Số điện thoại" value={trip.passengerPhone} />
      <Row
        label="Email"
        value={trip.passengerEmail ?? "Chưa cập nhật"}
        cls={!trip.passengerEmail ? styles.notUpdated : ""}
      />

      <div className={styles.divider} />

      {/* THÔNG TIN CHUYẾN ĐI */}
      <div className={styles.sectionTitle}>Thông tin chuyến đi</div>

      <Row label="Tuyến đường" value={trip.routeName} />
      {returnTrip && (
        <Row label="Tuyến đường (về)" value={returnTrip.routeName} />
      )}

      <Row
        label="Giờ xuất bến"
        value={trip.departureDatetime}
        cls={styles.green}
      />
      {returnTrip && (
        <Row
          label="Giờ xuất bến (về)"
          value={returnTrip.departureDatetime}
          cls={styles.green}
        />
      )}

      <Row label="Loại xe" value={trip.vehicleTypeName} />
      {returnTrip && (
        <Row label="Loại xe (về)" value={returnTrip.vehicleTypeName} />
      )}

      <Row
        label="Số lượng ghế"
        value={`${trip.seatCount} ghế (${trip.seatNumbers.join(", ")})`}
      />
      {returnTrip && (
        <Row
          label="Số lượng ghế (về)"
          value={`${returnTrip.seatCount} ghế (${returnTrip.seatNumbers.join(
            ", ",
          )})`}
        />
      )}

      <div className={styles.spaceBox} />

      <Row label="Điểm lên xe" value={trip.pickupPointName} />
      {trip.pickupPointAddress && (
        <Row value={trip.pickupPointAddress} sub cls={styles.address} />
      )}

      {returnTrip && (
        <>
          <Row label="Điểm lên xe (về)" value={returnTrip.pickupPointName} />
          {returnTrip.pickupPointAddress && (
            <Row
              value={returnTrip.pickupPointAddress}
              sub
              cls={styles.address}
            />
          )}
        </>
      )}

      <Row label="Dự kiến đến" value={trip.arrivalDatetime} cls={styles.red} />
      {returnTrip && (
        <Row
          label="Dự kiến đến (về)"
          value={returnTrip.arrivalDatetime}
          cls={styles.red}
        />
      )}

      <div className={styles.spaceBox} />

      <Row label="Điểm trả khách" value={trip.dropoffPointName} />
      {trip.dropoffPointAddress && (
        <Row value={trip.dropoffPointAddress} sub cls={styles.address} />
      )}

      {returnTrip && (
        <>
          <Row
            label="Điểm trả khách (về)"
            value={returnTrip.dropoffPointName}
          />
          {returnTrip.dropoffPointAddress && (
            <Row
              value={returnTrip.dropoffPointAddress}
              sub
              cls={styles.address}
            />
          )}
        </>
      )}

      <div className={styles.divider} />

      {/* CHI TIẾT GIÁ */}
      <div className={styles.sectionTitle}>Chi tiết giá</div>

      {summary.bookings.map((booking) => (
        <Row
          key={booking.bookingId}
          label={`${booking.routeName} (${booking.seatCount} ghế)`}
          value={formatCurrency(booking.totalAmount)}
          cls={styles.orange}
        />
      ))}

      <div className={styles.totalRow}>
        <span className={styles.totalLbl}>Tổng tiền</span>

        <span className={`${styles.totalVal} ${styles.orange}`}>
          {formatCurrency(totalAmount)}
        </span>
      </div>
    </div>
  );
}
