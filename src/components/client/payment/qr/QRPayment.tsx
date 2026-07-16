"use client";

import React, { memo } from "react";
import styles from "./QRPayment.module.css";
import { useRouter } from "next/navigation";
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
function formatExpiredAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không xác định";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
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
  const router = useRouter();
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
          <div className={styles.walletHeader}>
            <div className={styles.walletBrand}>
              <div className={styles.walletLogo}>PT</div>

              <div>
                <h3>Ví XeKhachPT</h3>
                <p>Thanh toán trực tiếp bằng số dư ví nội bộ.</p>
              </div>
            </div>

            <span
              className={`${styles.walletStatus} ${
                walletMissing <= 0
                  ? styles.walletStatusReady
                  : styles.walletStatusInsufficient
              }`}
            >
              {walletMissing <= 0 ? "Đủ số dư" : "Không đủ số dư"}
            </span>
          </div>

          <div className={styles.walletBalanceBox}>
            <span>Số dư khả dụng</span>

            <strong>{formatCurrency(manualInfo.walletBalance ?? 0)}</strong>
          </div>

          <div className={styles.walletSummary}>
            <div className={styles.walletRow}>
              <span>Số tiền vé</span>

              <strong>{formatCurrency(totalAmount)}</strong>
            </div>

            <div className={styles.walletRow}>
              <span>Phí giao dịch</span>
              <strong>0 đ</strong>
            </div>

            <div className={styles.walletRow}>
              <span>Số dư sau thanh toán</span>

              <strong>
                {formatCurrency(manualInfo.walletBalanceAfterPayment ?? 0)}
              </strong>
            </div>
          </div>

          {walletMissing > 0 ? (
            <div className={styles.walletInsufficient}>
              <div className={styles.walletWarningIcon}>!</div>

              <div>
                <strong>Số dư không đủ</strong>

                <p>
                  Ví của bạn còn thiếu <b>{formatCurrency(walletMissing)}</b> để
                  thanh toán vé này.
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.walletReady}>
              <span>✓</span>

              <div>
                <strong>Ví đủ số dư để thanh toán</strong>

                <p>Số tiền sẽ được trừ ngay sau khi bạn xác nhận.</p>
              </div>
            </div>
          )}

          {canPayWallet ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onConfirmManualPayment}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Đang xử lý thanh toán..."
                : `Thanh toán ${formatCurrency(totalAmount)}`}
            </button>
          ) : (
            <button
              type="button"
              className={styles.depositWalletBtn}
              onClick={() => {
                router.push("/account/wallet/deposit");
              }}
            >
              Nạp thêm tiền vào ví
            </button>
          )}

          <button
            type="button"
            className={styles.viewWalletBtn}
            onClick={() => {
              router.push("/account/wallet");
            }}
          >
            Xem ví và lịch sử giao dịch
          </button>
        </div>
      )}
      {showCash && manualInfo && (
        <div className={styles.cashCard}>
          <div className={styles.cashHeader}>
            <div className={styles.cashProviderIcon}>$</div>

            <div>
              <h3>Thanh toán tại quầy</h3>

              <p>
                Xuất trình mã QR cho nhân viên để hoàn tất thanh toán tiền mặt.
              </p>
            </div>

            <span className={styles.cashPendingBadge}>Chờ thanh toán</span>
          </div>

          <div className={styles.cashLayout}>
            <div className={styles.cashQrSection}>
              {qrImageUrl ? (
                <div className={styles.cashQrWrapper}>
                  <img
                    src={qrImageUrl}
                    alt="Mã QR thanh toán tiền mặt tại quầy"
                    className={styles.cashQrImage}
                  />

                  <div className={styles.cashQrBadge}>XeKhachPT</div>
                </div>
              ) : (
                <div className={styles.cashQrError}>
                  Không tạo được mã QR thanh toán tại quầy.
                </div>
              )}

              <strong className={styles.cashQrCaption}>
                Đưa mã này cho nhân viên quầy
              </strong>

              <span className={styles.cashQrDescription}>
                Không tự thanh toán hoặc chuyển khoản bằng mã QR này.
              </span>
            </div>

            <div className={styles.cashDetails}>
              <div className={styles.cashDetailRow}>
                <span>Mã đặt vé</span>

                <strong>{paymentData.bookingCode}</strong>
              </div>

              <div className={styles.cashDetailRow}>
                <span>Mã giao dịch</span>

                <strong className={styles.cashTransactionCode}>
                  {paymentData.transactionCode}
                </strong>
              </div>

              <div className={styles.cashDetailRow}>
                <span>Số tiền cần thanh toán</span>

                <strong className={styles.cashAmount}>
                  {formatCurrency(totalAmount)}
                </strong>
              </div>

              <div className={styles.cashDetailRow}>
                <span>Hạn thanh toán</span>

                <strong>{formatExpiredAt(paymentData.expiredAt)}</strong>
              </div>

              <div className={styles.cashInstruction}>
                <div className={styles.cashInstructionIcon}>i</div>

                <div>
                  <strong>Hướng dẫn tại quầy</strong>

                  <ol>
                    <li>Đưa mã QR cho nhân viên.</li>
                    <li>Nhân viên quét và kiểm tra thông tin vé.</li>
                    <li>Thanh toán đủ số tiền bằng tiền mặt.</li>
                    <li>Nhân viên xác nhận đã thu tiền.</li>
                    <li>Hệ thống tự động gửi vé qua email.</li>
                  </ol>
                </div>
              </div>

              <div className={styles.cashWarning}>
                <strong>Lưu ý</strong>

                <p>
                  Vé chỉ được xác nhận sau khi nhân viên quầy đã nhận tiền và
                  xác nhận giao dịch trên hệ thống.
                </p>
              </div>
            </div>
          </div>
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
