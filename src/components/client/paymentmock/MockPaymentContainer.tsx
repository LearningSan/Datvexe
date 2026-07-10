"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/client/helpers";
import styles from "./MockPayment.module.css";

export default function MockPaymentContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const bookingId = searchParams.get("bookingId") ?? "";
  const bookingCode = searchParams.get("bookingCode") ?? "";
  const method = searchParams.get("method") ?? "MOMO";
  const transactionCode = searchParams.get("transactionCode") ?? "";
  const amountParam = searchParams.get("amount");
  const amount = amountParam ? Number(amountParam) : 0;

  const [inputAmount, setInputAmount] = useState("");
  const [error, setError] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  // Sửa lỗi chính tả chữ ZaloPay
  const title = useMemo(() => {
    if (method === "ZALOPAY") return "ZaloPay";
    if (method === "VNPAY") return "VNPay";
    if (method === "VIETQR") return "VietQR";
    return "MoMo";
  }, [method]);

  async function handlePay() {
    setError("");
    const paidAmount = Number(inputAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Số tiền gốc không hợp lệ");
      return;
    }
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      setError("Vui lòng nhập số tiền thanh toán");
      return;
    }
    if (paidAmount !== amount) {
      setError("Số tiền thanh toán không khớp với hóa đơn");
      return;
    }
    if (!transactionCode) {
      setError("Thiếu mã giao dịch (Transaction Code)");
      return;
    }

    try {
      setIsPaying(true);

      const res = await fetch("/api/client/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionCode,
          amount: paidAmount,
          status: "SUCCESS",
          gatewayTransactionId: `MOCK_${Date.now()}`,
          gatewayResponse: {
            mode: "MOCK_PAYMENT_PAGE",
            method,
            amount: paidAmount,
          },
        }),
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        throw new Error(json.message || "Thanh toán thất bại");
      }

      router.replace(
        `/mock-payment/success?bookingId=${bookingId}&bookingCode=${bookingCode}&transactionCode=${transactionCode}`,
      );
    } catch (err: any) {
      setError(err.message || "Không thể xử lý dữ liệu thanh toán");
    } finally {
      setIsPaying(false);
    }
  }

  // Hàm xử lý khi user nhấn hủy, đẩy về trang thất bại có nút quay lại trang chủ
  function handleCancel() {
    router.replace(
      `/mock-payment/failed?bookingId=${bookingId}&bookingCode=${bookingCode}`,
    );
  }

  return (
    <main className={styles.main} data-method={method}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <span className={styles.badge}>Môi trường thử nghiệm</span>
        </div>

        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>Thanh toán đơn đặt vé xe khách</p>

        <div className={styles.amountContainer}>
          <p className={styles.amountLabel}>Số tiền cần thanh toán</p>
          <strong className={styles.amountValue}>
            {formatCurrency(amount)}
          </strong>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="amount-input">
            Nhập số tiền xác thực
          </label>
          <input
            id="amount-input"
            className={styles.input}
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            inputMode="numeric"
            placeholder="Nhập chính xác số tiền ở trên"
          />
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <span>⚠️</span> {error}
          </div>
        )}

        <div className={styles.actionGroup}>
          <button
            onClick={handlePay}
            disabled={isPaying}
            className={styles.submitBtn}
          >
            {isPaying ? "Đang xử lý..." : "Xác nhận thanh toán"}
          </button>

          <button
            onClick={handleCancel}
            disabled={isPaying}
            className={styles.cancelBtn}
            type="button"
          >
            Hủy giao dịch
          </button>
        </div>

        <p className={styles.metaText}>Ref: {transactionCode || "N/A"}</p>
      </div>
    </main>
  );
}
