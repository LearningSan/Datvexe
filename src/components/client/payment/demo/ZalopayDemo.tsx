"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./ZalopayDemo.module.css";

// 1. Chỉ định rõ 3 nguồn tiền hợp lệ của hệ thống ZaloPay Gateway thực tế
type PaymentSource = "WALLET" | "LINKED_BANK" | "DOMESTIC_CARD";

type DemoSession = {
  demoSessionId: number;
  provider: "ZALOPAY";
  amount: number;
  status:
    | "PENDING"
    | "VERIFY_REQUIRED"
    | "PROCESSING"
    | "SUCCESS"
    | "FAILED"
    | "EXPIRED";
  bookingCode: string;
  transactionCode: string;
  expiredAt: string;
  paymentStatus: string;
  customerPhone: string | null;
  paymentSource: PaymentSource | null;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type Step =
  | "LOADING"
  | "FORM"
  | "OTP"
  | "PROCESSING"
  | "SUCCESS"
  | "ERROR"
  | "EXPIRED";

// Loại bỏ hoàn toàn tùy chọn QR_SCAN
const PAYMENT_SOURCES: Array<{
  id: PaymentSource;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    id: "WALLET",
    title: "Ví điện tử ZaloPay",
    description: "Thanh toán bằng số dư tài khoản ví điện tử hệ thống",
    icon: "👛",
  },
  {
    id: "LINKED_BANK",
    title: "Tài khoản ngân hàng liên kết",
    description: "Hỗ trợ Napas, Vietcombank, Techcombank, BIDV...",
    icon: "🏦",
  },
  {
    id: "DOMESTIC_CARD",
    title: "Thẻ ATM nội địa / Internet Banking",
    description: "Yêu cầu tài khoản có đăng ký thanh toán trực tuyến",
    icon: "💳",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

// Sửa lỗi tính sai phút của Countdown bằng Math.floor thay vì Math.ceil
function formatRemainingTime(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remain = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}

export default function ZalopayDemo() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [session, setSession] = useState<DemoSession | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("0911111111");
  // Đặt giá trị nguồn tiền mặc định về WALLET hợp lệ
  const [paymentSource, setPaymentSource] = useState<PaymentSource>("WALLET");
  const [amount, setAmount] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("LOADING");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!token) {
      setMessage("Đường dẫn thanh toán không hợp lệ hoặc đã hết hạn.");
      setStep("ERROR");
      return;
    }

    let active = true;

    async function loadSession() {
      try {
        const response = await fetch(
          `/api/client/payments/demo-payment/session?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );

        const result =
          (await response.json()) as ApiResponse<DemoSession | null>;

        if (!response.ok || !result.data) {
          throw new Error(result.message);
        }

        if (!active) return;

        const data = result.data;
        if (data.provider !== "ZALOPAY") {
          throw new Error(
            "Phiên thanh toán không thuộc hệ thống đối tác ZaloPay.",
          );
        }

        setSession(data);
        setAmount(String(data.amount));

        if (data.customerPhone && data.customerPhone !== "QR_GATEWAY")
          setPhoneNumber(data.customerPhone);
        if (data.paymentSource) setPaymentSource(data.paymentSource);

        setRemainingSeconds(
          Math.max(
            Math.floor(
              (new Date(data.expiredAt).getTime() - Date.now()) / 1000,
            ),
            0,
          ),
        );

        if (data.status === "SUCCESS" || data.paymentStatus === "PAID") {
          setStep("SUCCESS");
          return;
        }

        if (data.status === "EXPIRED") {
          setStep("EXPIRED");
          return;
        }

        if (data.status === "VERIFY_REQUIRED") {
          setStep("OTP");
          return;
        }

        setStep("FORM");
      } catch (error) {
        if (!active) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "Không thể tải thông tin giao dịch.",
        );
        setStep("ERROR");
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (step === "SUCCESS" || step === "ERROR" || step === "EXPIRED") return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setStep("EXPIRED");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step]);

  const paymentSourceName = useMemo(
    () =>
      PAYMENT_SOURCES.find((source) => source.id === paymentSource)?.title ??
      "",
    [paymentSource],
  );

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    if (!session) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      // Đã loại bỏ QR_GATEWAY, truyền trực tiếp phoneNumber để tránh lỗi Regex ở backend
      const response = await fetch("/api/client/payments/demo-payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          provider: "ZALOPAY",
          customerPhone: phoneNumber,
          paymentSource,
          amount: Number(amount),
        }),
      });

      const result = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) throw new Error(result.message);

      setStep("OTP");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Thông tin xác thực không chính xác.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setStep("PROCESSING");

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1400));

      const response = await fetch(
        "/api/client/payments/demo-payment/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            provider: "ZALOPAY",
            verificationCode: otp,
          }),
        },
      );

      const result = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok) throw new Error(result.message);

      setStep("SUCCESS");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Mã xác thực không hợp lệ.",
      );
      setStep("OTP");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>
              <span>ZP</span>
            </div>
            <div>
              <div className={styles.brandName}>
                ZaloPay <span className={styles.gatewayText}>Gateway</span>
              </div>
              <div className={styles.brandSubtitle}>
                Hệ thống sandbox thử nghiệm tích hợp
              </div>
            </div>
          </div>
          <div className={styles.sandboxBadge}>MÔ TRƯỜNG GIẢ LẬP</div>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.warningAlert}>
          <strong>Cảnh báo an toàn:</strong> Bạn đang ở môi trường thử nghiệm
          (Sandbox). Vui lòng không cung cấp bất kỳ mật khẩu ví hoặc mã OTP thật
          trên trang này.
        </div>

        {step === "LOADING" && (
          <StateCard
            title="Đang đồng bộ cổng thanh toán"
            message="Vui lòng chờ trong giây lát..."
            loading
          />
        )}

        {step === "ERROR" && (
          <StateCard title="Giao dịch không hợp lệ" message={message} error />
        )}

        {step === "EXPIRED" && (
          <StateCard
            title="Đơn hàng đã hết hạn"
            message="Hết thời gian xử lý thanh toán hóa đơn. Vui lòng quay lại ứng dụng để thực hiện đơn hàng mới."
            error
          />
        )}

        {session && (step === "FORM" || step === "OTP") && (
          <div className={styles.layout}>
            {/* Khối xử lý cổng trái */}
            <section className={styles.formCard}>
              {step === "FORM" && (
                <form onSubmit={handleVerify} className={styles.formStructure}>
                  <h1 className={styles.sectionTitle}>
                    Chọn phương thức thanh toán
                  </h1>

                  <div className={styles.sourceList}>
                    {PAYMENT_SOURCES.map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        className={`${styles.sourceOption} ${paymentSource === source.id ? styles.sourceActive : ""}`}
                        onClick={() => setPaymentSource(source.id)}
                      >
                        <span className={styles.sourceIcon}>{source.icon}</span>
                        <div className={styles.sourceText}>
                          <span className={styles.sourceTitle}>
                            {source.title}
                          </span>
                          <span className={styles.sourceDesc}>
                            {source.description}
                          </span>
                        </div>
                        <span className={styles.radioGroup}>
                          <span
                            className={`${styles.radioCircle} ${paymentSource === source.id ? styles.radioChecked : ""}`}
                          />
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.fieldLabel}>
                      Số điện thoại tài khoản ZaloPay (Demo)
                    </label>
                    <input
                      className={styles.formInput}
                      value={phoneNumber}
                      onChange={(e) =>
                        setPhoneNumber(
                          e.target.value.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      inputMode="numeric"
                      placeholder="Nhập số điện thoại demo"
                    />
                  </div>

                  {/* Thêm ô nhập số tiền thanh toán bắt buộc cho nghiệp vụ demo */}
                  <div className={styles.inputGroup}>
                    <label className={styles.fieldLabel}>
                      Số tiền thanh toán
                    </label>
                    <div className={styles.amountInputWrapper}>
                      <input
                        className={styles.formInput}
                        value={amount}
                        onChange={(event) =>
                          setAmount(
                            event.target.value.replace(/\D/g, "").slice(0, 12),
                          )
                        }
                        inputMode="numeric"
                        placeholder="Nhập số tiền đơn hàng"
                      />
                      <span className={styles.currencyBadge}>VND</span>
                    </div>
                    <small className={styles.fieldHint}>
                      Nhập đúng số tiền hiển thị của đơn hàng để vượt qua hệ
                      thống kiểm thử.
                    </small>
                  </div>

                  <div className={styles.sandboxHintCard}>
                    💡 Hệ thống đang sử dụng cấu hình tài khoản demo tự động. Ấn
                    nút phía dưới để chuyển sang bước nhập OTP.
                  </div>

                  {message && (
                    <div className={styles.errorMessage}>{message}</div>
                  )}

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className={styles.btnSpinner} />
                    ) : (
                      "Xác nhận thanh toán"
                    )}
                  </button>
                </form>
              )}

              {step === "OTP" && (
                <form onSubmit={handleConfirm} className={styles.formStructure}>
                  <div className={styles.otpHeader}>
                    <h1>Nhập mã OTP xác thực</h1>
                    <p>
                      Mã xác nhận bảo mật vừa được gửi về tài khoản liên kết của
                      bạn.
                    </p>
                  </div>

                  <div className={styles.confirmBox}>
                    <div className={styles.confirmRow}>
                      <span>Nguồn vốn:</span>
                      <strong>{paymentSourceName}</strong>
                    </div>
                    <div className={styles.confirmRow}>
                      <span>Tài khoản:</span>
                      <strong>{phoneNumber || session.customerPhone}</strong>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.fieldLabel}>Nhập mã OTP</label>
                    <input
                      className={styles.otpInput}
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      inputMode="numeric"
                      placeholder="••••••" // Đã chỉnh thành 6 dấu chấm bảo mật
                      maxLength={6}
                      autoFocus
                    />
                  </div>

                  <div className={styles.sandboxOtpAlert}>
                    🔑 Mã xác thực bypass Sandbox:{" "}
                    <strong className={styles.otpCode}>888888</strong>
                  </div>

                  {message && (
                    <div className={styles.errorMessage}>{message}</div>
                  )}

                  <div className={styles.actionGroup}>
                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={isSubmitting || otp.length !== 6}
                    >
                      {isSubmitting ? (
                        <span className={styles.btnSpinner} />
                      ) : (
                        "Xác nhận hoàn tất"
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.backButton}
                      onClick={() => {
                        setOtp("");
                        setMessage("");
                        setStep("FORM");
                      }}
                    >
                      Thay đổi phương thức thanh toán
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Sidebar thông tin hóa đơn bên phải */}
            <aside className={styles.orderCard}>
              <h2 className={styles.orderHeader}>Thông tin đơn hàng</h2>

              <div className={styles.totalBlock}>
                <span className={styles.totalLabel}>
                  Số tiền cần thanh toán
                </span>
                <strong className={styles.amountText}>
                  {formatCurrency(session.amount)}
                </strong>
              </div>

              <div className={styles.orderRows}>
                <div className={styles.row}>
                  <span className={styles.rowLabel}>Nhà cung cấp</span>
                  <strong className={styles.rowValue}>XeKhachPT</strong>{" "}
                  {/* Đã dọn dẹp chữ Vexere Client */}
                </div>
                <div className={styles.row}>
                  <span className={styles.rowLabel}>Mã đặt vé</span>
                  <strong className={styles.rowValue}>
                    {session.bookingCode}
                  </strong>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowLabel}>Mã đơn hàng</span>
                  <strong className={`${styles.rowValue} ${styles.mono}`}>
                    {session.transactionCode}
                  </strong>
                </div>
                <div className={styles.row}>
                  <span className={styles.rowLabel}>Thời gian hết hạn</span>
                  <strong
                    className={`${styles.countdown} ${remainingSeconds < 60 ? styles.urgent : ""}`}
                  >
                    {formatRemainingTime(remainingSeconds)}
                  </strong>
                </div>
              </div>
            </aside>
          </div>
        )}

        {step === "PROCESSING" && (
          <StateCard
            title="Đang đối soát giao dịch"
            message="Hệ thống ZaloPay đang ghi nhận dòng tiền, vui lòng không tắt trình duyệt hoặc tải lại trang..."
            loading
          />
        )}

        {step === "SUCCESS" && session && (
          <section className={styles.successCard}>
            <div className={styles.successIconWrapper}>
              <span className={styles.successIconCheck}>✓</span>
            </div>
            <h1>Thanh toán hoàn tất!</h1>
            <p className={styles.successMessage}>
              Cổng thanh toán ZaloPay Sandbox đã hoàn thành xử lý. Hệ thống đang
              đồng bộ và chuyển hướng bạn về lại website nhà xe...
            </p>

            <div className={styles.successDetails}>
              <div className={styles.successRow}>
                <span>Mã giao dịch</span>
                <strong className={styles.mono}>
                  {session.transactionCode}
                </strong>
              </div>
              <div className={styles.successRow}>
                <span>Tổng số tiền</span>
                <strong className={styles.successAmount}>
                  {formatCurrency(session.amount)}
                </strong>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function StateCard(props: {
  title: string;
  message: string;
  loading?: boolean;
  error?: boolean;
}) {
  return (
    <section className={styles.stateCard}>
      {props.loading ? (
        <div className={styles.spinner} />
      ) : (
        <div
          className={`${styles.statusIcon} ${props.error ? styles.errorIcon : styles.successIcon}`}
        >
          {props.error ? "!" : "✓"}
        </div>
      )}
      <h2>{props.title}</h2>
      <p>{props.message}</p>
    </section>
  );
}
