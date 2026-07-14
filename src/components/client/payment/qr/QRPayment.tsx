"use client";

import React, { memo } from "react";
import styles from "./QRPayment.module.css";

import type {
  PaymentMethodType,
  CreatePaymentResponse,
} from "@/types/client/payment/payment.type";

import { formatCurrency } from "@/lib/client/helpers";

interface QRPaymentProps {
  method: PaymentMethodType;
  totalAmount: number;
  paymentData: CreatePaymentResponse | null;
  isSubmitting: boolean;
  onCreatePayment: () => void;
  onConfirmManualPayment: () => void;
}

function getProviderName(method: PaymentMethodType) {
  if (method === "PAYOS") return "PayOS";
  if (method === "VNPAY") return "VNPay";
  if (method === "MOMO") return "MoMo";
  if (method === "ZALOPAY") return "ZaloPay";
  if (method === "VIETQR") return "VietQR";
  if (method === "INTERNAL_WALLET") return "Ví nội bộ";
  if (method === "CASH") return "Thanh toán tại quầy";
  return method;
}

function getLogoText(method: PaymentMethodType) {
  if (method === "PAYOS") return "PO";
  if (method === "VNPAY") return "VP";
  if (method === "MOMO") return "MM";
  if (method === "ZALOPAY") return "ZP";
  if (method === "VIETQR") return "QR";
  if (method === "INTERNAL_WALLET") return "PT";
  if (method === "CASH") return "$";
  return "";
}

function getQrAppName(method: PaymentMethodType) {
  if (method === "MOMO") {
    return "ứng dụng MoMo";
  }

  if (method === "ZALOPAY") {
    return "ứng dụng ZaloPay hoặc camera";
  }

  if (method === "VNPAY") {
    return "ứng dụng ngân hàng, VNPay hoặc camera";
  }

  return "ứng dụng ngân hàng";
}

function isDirectQrImageUrl(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("img.vietqr.io/") ||
    normalized.includes("api.qrserver.com/") ||
    /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(value)
  );
}

function buildQrImageUrl(value: string | null | undefined) {
  if (!value) return null;
  if (isDirectQrImageUrl(value)) return value;
  return (
    "https://api.qrserver.com/v1/create-qr-code/" +
    `?size=320x320&data=${encodeURIComponent(value)}`
  );
}

const QRPayment = memo(function QRPayment({
  method,
  totalAmount,
  paymentData,
  isSubmitting,
  onCreatePayment,
  onConfirmManualPayment,
}: QRPaymentProps) {
  const manualInfo = paymentData?.manualInfo;
  const qrImageUrl = buildQrImageUrl(paymentData?.qrCodeUrl);

  const handleOpenPayment = () => {
    if (!paymentData) return;
    if (paymentData.deeplink) {
      window.location.href = paymentData.deeplink;
      return;
    }
    if (paymentData.paymentUrl) {
      window.location.href = paymentData.paymentUrl;
    }
  };

  const showQr = Boolean(paymentData?.uiMode === "QR" && qrImageUrl);
  const showIframe = paymentData?.uiMode === "IFRAME" && paymentData.paymentUrl;
  const showRedirect =
    paymentData?.uiMode === "REDIRECT" &&
    Boolean(paymentData.paymentUrl || paymentData.deeplink);

  const showWallet = paymentData?.uiMode === "WALLET";
  const showCash = paymentData?.uiMode === "CASH";

  const walletMissing = manualInfo?.missingAmount ?? 0;
  const canPayWallet =
    showWallet && walletMissing <= 0 && paymentData?.status !== "PAID";
  const isVietQR = method === "VIETQR";

  // Hàm helper lấy class màu sắc trạng thái
  const getStatusClass = (status?: string) => {
    if (status === "PAID") return styles.statusSuccess;
    if (status === "WAITING_CONFIRM") return styles.statusProcessing;
    return styles.statusPending;
  };

  return (
    <div className={styles.wrapper}>
      {/* Khối số tiền đảo vị trí nhãn lên trên để dễ đọc */}
      <div className={styles.amountBox}>
        <div className={styles.amountLabel}>Tổng thanh toán</div>
        <div className={styles.amount}>{formatCurrency(totalAmount)}</div>
      </div>

      {!paymentData && (
        <button
          className={styles.primaryBtn}
          onClick={onCreatePayment}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang tạo thanh toán..." : "Tạo thanh toán"}
        </button>
      )}

      {showQr && qrImageUrl && (
        <div className={styles.qrCard}>
          <div className={styles.qrVisualSection}>
            <div
              className={`${styles.qrImageWrap} ${isVietQR ? styles.qrImageWrapVietQR : ""}`}
            >
              <img
                src={qrImageUrl}
                alt={`QR thanh toán ${getProviderName(method)}`}
                className={`${styles.qr} ${isVietQR ? styles.qrVietQR : ""}`}
              />
              {method !== "VIETQR" && (
                <div className={styles.logoBadge}>{getLogoText(method)}</div>
              )}
            </div>
            <div className={styles.qrCaption}>
              Quét mã bằng ứng dụng để thanh toán tự động
            </div>
          </div>

          <div className={styles.qrGuideSection}>
            <div className={styles.qrGuideTitle}>
              Hướng dẫn thanh toán bằng <span>{getProviderName(method)}</span>
            </div>

            <ul className={styles.guideList}>
              <li>
                <span className={styles.stepNumber}>1</span>
                <div className={styles.stepText}>
                  Mở <strong>{getQrAppName(method)}</strong> trên điện thoại
                </div>
              </li>
              <li>
                <span className={styles.stepNumber}>2</span>
                <div className={styles.stepText}>
                  Chọn chức năng <strong>Quét mã QR</strong>
                </div>
              </li>
              <li>
                <span className={styles.stepNumber}>3</span>
                <div className={styles.stepText}>
                  Quét mã QR đang hiển thị trên màn hình
                </div>
              </li>
              <li>
                <span className={styles.stepNumber}>4</span>
                <div className={styles.stepText}>
                  Kiểm tra số tiền và <strong>xác nhận thanh toán</strong>
                </div>
              </li>
            </ul>
          </div>
        </div>
      )}

      {showIframe && (
        <div className={styles.iframeCard}>
          <iframe
            src={paymentData.paymentUrl!}
            className={styles.paymentIframe}
            title="Cổng thanh toán"
          />
        </div>
      )}

      {showRedirect && (
        <div className={styles.redirectCard}>
          <div className={styles.providerIcon}>{getLogoText(method)}</div>
          <h3>Tiếp tục thanh toán qua {getProviderName(method)}</h3>
          <p>
            Hệ thống sẽ mở trang thanh toán của nhà cung cấp. Sau khi hoàn tất,
            bạn sẽ được đưa về lại trang thanh toán.
          </p>

          <button
            className={styles.primaryBtn}
            onClick={handleOpenPayment}
            disabled={isSubmitting}
          >
            {paymentData.actionText || `Mở ${getProviderName(method)}`}
          </button>
        </div>
      )}

      {showWallet && manualInfo && (
        <div className={styles.walletCard}>
          <h3>Ví nội bộ XeKhachPT</h3>

          <div className={styles.walletRow}>
            <span>Số dư ví</span>
            <strong>{formatCurrency(manualInfo.walletBalance ?? 0)}</strong>
          </div>

          <div className={styles.walletRow}>
            <span>Số tiền thanh toán</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>

          <div className={styles.walletRow}>
            <span>Số dư sau thanh toán</span>
            <strong>
              {formatCurrency(manualInfo.walletBalanceAfterPayment ?? 0)}
            </strong>
          </div>

          {walletMissing > 0 && (
            <div className={styles.errorBox}>
              Số dư không đủ. Còn thiếu {formatCurrency(walletMissing)}.
            </div>
          )}

          {canPayWallet && (
            <button
              className={styles.primaryBtn}
              onClick={onConfirmManualPayment}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang thanh toán..." : "Thanh toán bằng ví"}
            </button>
          )}
        </div>
      )}

      {showCash && manualInfo && (
        <div className={styles.cashCard}>
          <h3>Thanh toán tại quầy</h3>
          <p>Mã đặt chỗ / mã giao dịch:</p>
          <div className={styles.codeBox}>{paymentData.transactionCode}</div>
          <p>{manualInfo.instruction}</p>
        </div>
      )}

      {paymentData && (
        <div className={styles.infoBox}>
          <div>
            Mã giao dịch: <strong>{paymentData.transactionCode}</strong>
          </div>
          <div>
            Phương thức: <strong>{getProviderName(method)}</strong>
          </div>
          <div>
            Trạng thái:{" "}
            <strong className={getStatusClass(paymentData.status)}>
              {paymentData.status === "PAID"
                ? "Đã thanh toán"
                : paymentData.status === "WAITING_CONFIRM"
                  ? "Đang xử lý"
                  : "Đang chờ thanh toán"}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
});

export default QRPayment;
