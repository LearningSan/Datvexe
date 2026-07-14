"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useSearchParams } from "next/navigation";

import styles from "./VnpayDemo.module.css";

type DemoSession = {
  demoSessionId: number;
  provider: "VNPAY";
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
  selectedBank: string | null;
  accountNumberMasked: string | null;
  accountHolder: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

const BANKS = [
  {
    code: "VCB",
    name: "Vietcombank",
    shortName: "VCB",
  },
  {
    code: "BIDV",
    name: "BIDV",
    shortName: "BIDV",
  },
  {
    code: "CTG",
    name: "VietinBank",
    shortName: "CTG",
  },
  {
    code: "AGR",
    name: "Agribank",
    shortName: "AGR",
  },
  {
    code: "MB",
    name: "MB Bank",
    shortName: "MB",
  },
  {
    code: "TCB",
    name: "Techcombank",
    shortName: "TCB",
  },
  {
    code: "ACB",
    name: "ACB",
    shortName: "ACB",
  },
  {
    code: "STB",
    name: "Sacombank",
    shortName: "STB",
  },
];

function formatCurrency(value: number) {
  return `${Number(value).toLocaleString("vi-VN")} đ`;
}

function formatRemainingTime(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

export default function VNPayDemo() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [session, setSession] = useState<DemoSession | null>(null);

  const [selectedBank, setSelectedBank] = useState("");

  const [accountNumber, setAccountNumber] = useState("");

  const [accountHolder, setAccountHolder] = useState("");

  const [amount, setAmount] = useState("");

  const [otp, setOtp] = useState("");

  const [step, setStep] = useState<
    "LOADING" | "FORM" | "OTP" | "PROCESSING" | "SUCCESS" | "ERROR" | "EXPIRED"
  >("LOADING");

  const [message, setMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!token) {
      setMessage("Đường dẫn thanh toán không hợp lệ.");
      setStep("ERROR");
      return;
    }

    let active = true;

    async function loadSession() {
      try {
        const response = await fetch(
          `/api/client/payments/demo-payment/session?token=${encodeURIComponent(token)}`,
          {
            cache: "no-store",
          },
        );

        const result =
          (await response.json()) as ApiResponse<DemoSession | null>;

        if (!response.ok || !result.data) {
          throw new Error(result.message);
        }

        if (!active) {
          return;
        }

        const data = result.data;

        if (data.provider !== "VNPAY") {
          throw new Error("Phiên thanh toán không thuộc VNPay.");
        }

        setSession(data);
        setAmount(String(data.amount));

        const seconds = Math.max(
          Math.floor((new Date(data.expiredAt).getTime() - Date.now()) / 1000),
          0,
        );

        setRemainingSeconds(seconds);

        if (data.status === "SUCCESS" || data.paymentStatus === "PAID") {
          setStep("SUCCESS");
          return;
        }

        if (data.status === "EXPIRED") {
          setStep("EXPIRED");
          return;
        }

        if (data.status === "VERIFY_REQUIRED") {
          setSelectedBank(data.selectedBank ?? "");
          setAccountHolder(data.accountHolder ?? "");
          setStep("OTP");
          return;
        }

        setStep("FORM");
      } catch (error) {
        if (!active) {
          return;
        }

        setMessage(
          error instanceof Error ? error.message : "Không tải được giao dịch.",
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
    if (step === "SUCCESS" || step === "ERROR" || step === "EXPIRED") {
      return;
    }

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

    return () => {
      window.clearInterval(timer);
    };
  }, [step]);

  const selectedBankName = useMemo(
    () => BANKS.find((bank) => bank.code === selectedBank)?.name ?? "",
    [selectedBank],
  );

  async function handleVerify(event: FormEvent) {
    event.preventDefault();

    if (!session) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/client/payments/demo-payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          provider: "VNPAY",
          selectedBank,
          accountNumber,
          accountHolder,
          amount: Number(amount),
        }),
      });

      const result = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok) {
        throw new Error(result.message);
      }

      setStep("OTP");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Thông tin thanh toán không hợp lệ.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();

    setIsSubmitting(true);
    setMessage("");

    try {
      setStep("PROCESSING");

      await new Promise((resolve) => {
        window.setTimeout(resolve, 1200);
      });

      const response = await fetch("/api/client/payments/demo-payment/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          provider: "VNPAY",
          verificationCode: otp,
        }),
      });

      const result = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok) {
        throw new Error(result.message);
      }

      setStep("SUCCESS");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Thanh toán không thành công.",
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
            <div className={styles.brandMark}>VP</div>

            <div>
              <div className={styles.brandName}>VNPay Demo</div>

              <div className={styles.brandSubtitle}>
                Cổng thanh toán mô phỏng
              </div>
            </div>
          </div>

          <div className={styles.sandboxBadge}>SANDBOX DEMO</div>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.warning}>
          Đây là môi trường mô phỏng phục vụ kiểm thử. Không nhập thông tin ngân
          hàng hoặc OTP thật.
        </section>

        {step === "LOADING" && (
          <section className={styles.stateCard}>
            <div className={styles.spinner} />
            <h2>Đang tải giao dịch</h2>
            <p>Hệ thống đang kiểm tra thông tin thanh toán.</p>
          </section>
        )}

        {step === "ERROR" && (
          <section className={styles.stateCard}>
            <div className={styles.errorIcon}>!</div>
            <h2>Không thể mở giao dịch</h2>
            <p>{message}</p>
          </section>
        )}

        {step === "EXPIRED" && (
          <section className={styles.stateCard}>
            <div className={styles.errorIcon}>×</div>
            <h2>Giao dịch đã hết hạn</h2>
            <p>Vui lòng quay lại trang đặt vé và tạo giao dịch mới.</p>
          </section>
        )}

        {session && (step === "FORM" || step === "OTP") && (
          <div className={styles.layout}>
            <aside className={styles.summaryCard}>
              <div className={styles.summaryTitle}>Thông tin đơn hàng</div>

              <div className={styles.merchant}>
                <div className={styles.merchantIcon}>XK</div>

                <div>
                  <span>Đơn vị nhận</span>
                  <strong>XeKhachPT</strong>
                </div>
              </div>

              <div className={styles.summaryRows}>
                <div>
                  <span>Mã đặt vé</span>
                  <strong>{session.bookingCode}</strong>
                </div>

                <div>
                  <span>Mã giao dịch</span>
                  <strong className={styles.code}>
                    {session.transactionCode}
                  </strong>
                </div>

                <div>
                  <span>Thời gian còn lại</span>
                  <strong className={styles.countdown}>
                    {formatRemainingTime(remainingSeconds)}
                  </strong>
                </div>
              </div>

              <div className={styles.totalBox}>
                <span>Tổng số tiền thanh toán</span>
                <strong>{formatCurrency(session.amount)}</strong>
              </div>
            </aside>

            <section className={styles.formCard}>
              {step === "FORM" && (
                <form onSubmit={handleVerify}>
                  <div className={styles.sectionHeader}>
                    <span>1</span>
                    <div>
                      <h1>Thanh toán qua ngân hàng</h1>
                      <p>Chọn ngân hàng và nhập thông tin tài khoản demo.</p>
                    </div>
                  </div>

                  <label className={styles.label}>Chọn ngân hàng</label>

                  <div className={styles.bankGrid}>
                    {BANKS.map((bank) => (
                      <button
                        key={bank.code}
                        type="button"
                        className={`${styles.bankOption} ${
                          selectedBank === bank.code ? styles.bankActive : ""
                        }`}
                        onClick={() => setSelectedBank(bank.code)}
                      >
                        <span className={styles.bankLogo}>
                          {bank.shortName}
                        </span>
                        <span>{bank.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className={styles.fieldGrid}>
                    <label className={styles.field}>
                      <span>Số tài khoản demo</span>

                      <input
                        value={accountNumber}
                        onChange={(event) =>
                          setAccountNumber(
                            event.target.value.replace(/\D/g, "").slice(0, 16),
                          )
                        }
                        inputMode="numeric"
                        placeholder="Nhập 8–16 chữ số"
                        autoComplete="off"
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Tên chủ tài khoản</span>

                      <input
                        value={accountHolder}
                        onChange={(event) =>
                          setAccountHolder(event.target.value)
                        }
                        placeholder="NGUYEN VAN A"
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  <label className={styles.field}>
                    <span>Số tiền thanh toán</span>

                    <div className={styles.amountInput}>
                      <input
                        value={amount}
                        onChange={(event) =>
                          setAmount(event.target.value.replace(/\D/g, ""))
                        }
                        inputMode="numeric"
                      />
                      <strong>VND</strong>
                    </div>

                    <small>Nhập đúng số tiền của đơn hàng để tiếp tục.</small>
                  </label>

                  {message && (
                    <div className={styles.errorMessage}>{message}</div>
                  )}

                  <div className={styles.demoInfo}>
                    <strong>Thông tin kiểm thử</strong>
                    <span>Số tài khoản: nhập bất kỳ 8–16 chữ số</span>
                    <span>Tên tài khoản: nhập tên demo bất kỳ</span>
                  </div>

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting || !selectedBank}
                  >
                    {isSubmitting ? "Đang kiểm tra..." : "Tiếp tục"}
                  </button>
                </form>
              )}

              {step === "OTP" && (
                <form onSubmit={handleConfirm}>
                  <div className={styles.sectionHeader}>
                    <span>2</span>
                    <div>
                      <h1>Xác thực giao dịch</h1>
                      <p>Nhập mã OTP demo để hoàn tất thanh toán.</p>
                    </div>
                  </div>

                  <div className={styles.confirmSummary}>
                    <div>
                      <span>Ngân hàng</span>
                      <strong>
                        {selectedBankName || session.selectedBank}
                      </strong>
                    </div>

                    <div>
                      <span>Chủ tài khoản</span>
                      <strong>{accountHolder || session.accountHolder}</strong>
                    </div>

                    <div>
                      <span>Số tiền</span>
                      <strong>{formatCurrency(session.amount)}</strong>
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span>Mã OTP demo</span>

                    <input
                      className={styles.otpInput}
                      value={otp}
                      onChange={(event) =>
                        setOtp(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      inputMode="numeric"
                      placeholder="••••••"
                      autoComplete="one-time-code"
                    />
                  </label>

                  <div className={styles.otpHint}>
                    <span>Mã OTP kiểm thử</span>
                    <strong>123456</strong>
                  </div>

                  {message && (
                    <div className={styles.errorMessage}>{message}</div>
                  )}

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting || otp.length !== 6}
                  >
                    Xác nhận thanh toán
                  </button>

                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={() => {
                      setMessage("");
                      setOtp("");
                      setStep("FORM");
                    }}
                  >
                    Quay lại
                  </button>
                </form>
              )}
            </section>
          </div>
        )}

        {step === "PROCESSING" && (
          <section className={styles.stateCard}>
            <div className={styles.spinner} />
            <h2>Đang xử lý thanh toán</h2>
            <p>
              VNPay Demo đang xác nhận giao dịch. Vui lòng không đóng trang.
            </p>
          </section>
        )}

        {step === "SUCCESS" && session && (
          <section className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>

            <h1>Thanh toán thành công</h1>

            <p>
              Giao dịch VNPay Demo đã được xác nhận. Trang đặt vé sẽ tự cập nhật
              trạng thái thanh toán.
            </p>

            <div className={styles.successDetails}>
              <div>
                <span>Mã đặt vé</span>
                <strong>{session.bookingCode}</strong>
              </div>

              <div>
                <span>Mã giao dịch</span>
                <strong>{session.transactionCode}</strong>
              </div>

              <div>
                <span>Số tiền</span>
                <strong>{formatCurrency(session.amount)}</strong>
              </div>
            </div>

            <div className={styles.successNote}>
              Bạn có thể đóng trang này và quay lại màn hình đặt vé.
            </div>
          </section>
        )}
      </div>

      <footer className={styles.footer}>
        <span>VNPay Sandbox Demo dành cho mục đích trình diễn nghiệp vụ</span>
        <span>XeKhachPT © 2026</span>
      </footer>
    </main>
  );
}
