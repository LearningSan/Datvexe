"use client";

import React from "react";
import styles from "./PaymentSummary.module.css";
import type { BookingPaymentSummary } from "@/types/client/payment/payment.type";
import { formatCurrency } from "@/lib/client/helpers";

interface Props {
  summary: BookingPaymentSummary;
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
      <span className={styles.lbl}>{label}</span>
      <span className={`${styles.val} ${cls ?? ""}`}>{value}</span>
    </div>
  );
}

export default function PaymentSummary({ summary }: Props) {
  return (
    <div className={styles.card}>
      {/* HEADER TỔNG HỢP */}
      <div className={styles.header}>
        <h3 className={styles.title}>Chi tiết đặt vé</h3>
        <span className={styles.routeHighlight}>{summary.routeName}</span>
      </div>

      {/* 1. SECTION: THÔNG TIN HÀNH KHÁCH (GỌN GÀNG) */}
      <div className={styles.sectionTitle}>Thông tin hành khách</div>
      <Row label="Hành khách" value={summary.passengerName} />
      <Row label="Số điện thoại" value={summary.passengerPhone} />
      <Row
        label="Email"
        value={
          summary.passengerEmail ? summary.passengerEmail : "Chưa cập nhật"
        }
        cls={!summary.passengerEmail ? styles.notUpdated : ""}
      />
      <div className={styles.divider} />

      <div className={styles.sectionTitle}>Thông tin chuyến đi</div>
      <Row
        label="Giờ xuất bến"
        value={summary.departureDatetime}
        cls={styles.green}
      />
      <Row label="Loại xe" value={summary.vehicleTypeName} />
      <Row
        label="Số lượng ghế"
        value={`${summary.seatCount} ghế (${summary.seatNumbers.join(", ")})`}
      />

      <div className={styles.spaceBox} />

      {/* Điểm đón */}
      <Row label="Điểm lên xe" value={summary.pickupPointName} />
      {summary.pickupPointAddress && (
        <Row value={summary.pickupPointAddress} sub cls={styles.address} />
      )}
      <Row
        label="Dự kiến đến"
        value={summary.arrivalDatetime}
        cls={styles.red}
      />

      <div className={styles.spaceBox} />

      {/* Điểm trả */}
      <Row label="Điểm trả khách" value={summary.dropoffPointName} />
      {summary.dropoffPointAddress && (
        <Row value={summary.dropoffPointAddress} sub cls={styles.address} />
      )}

      <div className={styles.divider} />

      {/* 3. SECTION: CHI TIẾT GIÁ & TỔNG TIỀN */}
      <div className={styles.sectionTitle}>Chi tiết giá</div>
      <Row
        label={`Giá vé (×${summary.seatCount})`}
        value={formatCurrency(summary.ticketPrice * summary.seatCount)}
        cls={styles.orange}
      />
      {summary.discountAmount > 0 && (
        <Row
          label="Giảm giá"
          value={`-${formatCurrency(summary.discountAmount)}`}
          cls={styles.green}
        />
      )}

      {/* KHỐI TỔNG TIỀN NỔI BẬT */}
      <div className={styles.totalRow}>
        <span className={styles.totalLbl}>Tổng tiền</span>
        <span className={`${styles.totalVal} ${styles.orange}`}>
          {formatCurrency(summary.totalAmount)}
        </span>
      </div>
    </div>
  );
}
