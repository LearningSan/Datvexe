"use client";

import React from "react";
import styles from "./PaymentMethods.module.css";

import type { PaymentMethodType } from "@/types/client/payment/payment.type";

interface Option {
  id: PaymentMethodType;
  name: string;
  note?: string;
  colorClass: string;
  label: string;
}

const OPTIONS: Option[] = [
  {
    id: "PAYOS",
    name: "PayOS",
    note: "Cổng thanh toán PayOS: QR, ATM, Visa/Master...",
    colorClass: styles.vnpay,
    label: "PO",
  },
  {
    id: "VNPAY",
    name: "VNPay",
    note: "Quét QR để mở cổng VNPay và chọn ngân hàng",
    colorClass: styles.vnpay,
    label: "VP",
  },
  {
    id: "MOMO",
    name: "MoMo",
    note: "Thanh toán bằng app MoMo, deeplink hoặc QR",
    colorClass: styles.momo,
    label: "MM",
  },
  {
    id: "ZALOPAY",
    name: "ZaloPay",
    note: "Quét QR bằng ZaloPay hoặc camera điện thoại",
    colorClass: styles.zalopay,
    label: "ZP",
  },
  {
    id: "VIETQR",
    name: "VietQR",
    note: "Quét QR bằng app ngân hàng, không redirect",
    colorClass: styles.vietqr,
    label: "QR",
  },
  {
    id: "INTERNAL_WALLET",
    name: "Ví nội bộ XeKhachPT",
    note: "Trừ số dư ví nội bộ của khách hàng",
    colorClass: styles.cash,
    label: "PT",
  },
  {
    id: "CASH",
    name: "Thanh toán tại quầy",
    note: "Giữ mã đặt chỗ và thanh toán tiền mặt tại quầy",
    colorClass: styles.cash,
    label: "$$",
  },
];

interface Props {
  selected: PaymentMethodType;
  onChange: (method: PaymentMethodType) => void;
}

export default function PaymentMethods({ selected, onChange }: Props) {
  return (
    <div>
      <h2 className={styles.title}>Chọn phương thức thanh toán</h2>

      <div className={styles.list}>
        {OPTIONS.map((option) => {
          const active = selected === option.id;

          return (
            <label
              key={option.id}
              className={`${styles.row} ${active ? styles.active : ""}`}
            >
              <input
                type="radio"
                name="payment-method"
                className={styles.input}
                checked={active}
                onChange={() => onChange(option.id)}
              />

              <span className={styles.radio}>
                {active && <span className={styles.radioDot} />}
              </span>

              <span className={`${styles.logo} ${option.colorClass}`}>
                {option.label}
              </span>

              <span className={styles.info}>
                <span className={styles.name}>{option.name}</span>
                {option.note && (
                  <span className={styles.note}>{option.note}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
