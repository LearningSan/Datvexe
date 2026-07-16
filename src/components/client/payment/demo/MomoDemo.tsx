"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./MomoDemo.module.css";

type DemoSession = {
  demoSessionId: number;
  provider: "MOMO";
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
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type Step =
  | "LOADING"
  | "FORM"
  | "PIN"
  | "PROCESSING"
  | "SUCCESS"
  | "ERROR"
  | "EXPIRED";

const DEMO_BALANCE = 10_000_000;

function formatCurrency(value: number) {
  return `${Number(value).toLocaleString("vi-VN")} đ`;
}

// 1. Sửa lỗi hiển thị Countdown (ví dụ: 9p 1s hiển thị chính xác là 09:01)
function formatRemainingTime(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

export default function MomoDemo() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [session, setSession] = useState<DemoSession | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("0900000000");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<Step>("LOADING");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Thêm state để cập nhật đồng hồ hệ thống theo thời gian thực (Thay cho 9:41 hard-code)
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        `${String(now.getHours()).padStart(2, "0")}:${String(
          now.getMinutes(),
        ).padStart(2, "0")}`,
      );
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 60000);
    return () => clearInterval(clockInterval);
  }, []);

  // 1. Luồng tải dữ liệu phiên (Session) ban đầu
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
          { cache: "no-store" },
        );

        const result =
          (await response.json()) as ApiResponse<DemoSession | null>;

        if (!response.ok || !result.data) {
          throw new Error(result.message);
        }

        if (!active) return;

        const data = result.data;

        if (data.provider !== "MOMO") {
          throw new Error("Phiên thanh toán không thuộc MoMo.");
        }

        setSession(data);
        setAmount(String(data.amount));

        if (data.customerPhone) {
          setPhoneNumber(data.customerPhone);
        }

        const seconds = Math.max(
          Math.ceil((new Date(data.expiredAt).getTime() - Date.now()) / 1000),
          0,
        );

        setRemainingSeconds(seconds);

        if (data.status === "SUCCESS" || data.paymentStatus === "PAID") {
          setStep("SUCCESS");
          return;
        }

        if (data.status === "EXPIRED" || seconds <= 0) {
          setStep("EXPIRED");
          return;
        }

        if (data.status === "VERIFY_REQUIRED") {
          setStep("PIN");
          return;
        }

        setStep("FORM");
      } catch (error) {
        if (!active) return;
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

  // 2. Sửa lỗi tối ưu Timer effect: Chỉ phụ thuộc duy nhất vào [step], tránh re-create interval liên tục
  useEffect(() => {
    if (
      step === "SUCCESS" ||
      step === "ERROR" ||
      step === "EXPIRED" ||
      step === "LOADING"
    ) {
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

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    if (!session) return;

    // 6. Kiểm tra điều kiện số dư ví demo trước khi đẩy luồng đi tiếp
    if (Number(amount) > DEMO_BALANCE) {
      setMessage("Số dư ví demo không đủ để thực hiện thanh toán này.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/client/payments/demo-payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          provider: "MOMO",
          customerPhone: phoneNumber,
          amount: Number(amount), // 3. Sửa lỗi: Loại bỏ hoàn toàn fallback '|| session.amount', ép buộc validate qua backend
          paymentSource: "WALLET",
        }),
      });

      const result = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok) throw new Error(result.message);

      setStep("PIN");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Thông tin ví không hợp lệ.",
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
            provider: "MOMO",
            verificationCode: pin,
          }),
        },
      );

      const result = (await response.json()) as ApiResponse<unknown>;

      if (!response.ok) throw new Error(result.message);

      setStep("SUCCESS");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Thanh toán không thành công.",
      );
      setStep("PIN");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>M</div>
            <div>
              <div className={styles.brandName}>MoMo Demo</div>
              <div className={styles.brandSubtitle}>Ví điện tử mô phỏng</div>
            </div>
          </div>
          <div className={styles.testBadge}>TEST WALLET</div>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.warning}>
          Đây là môi trường mô phỏng. Không nhập số điện thoại, mật khẩu hoặc
          PIN MoMo thật.
        </section>

        {step === "LOADING" && (
          <StateCard
            title="Đang tải giao dịch"
            message="MoMo Demo đang kiểm tra thông tin thanh toán."
            loading
          />
        )}

        {step === "ERROR" && (
          <StateCard title="Không thể mở giao dịch" message={message} error />
        )}

        {step === "EXPIRED" && (
          <StateCard
            title="Giao dịch đã hết hạn"
            message="Vui lòng quay lại trang đặt vé và tạo giao dịch mới."
            error
          />
        )}

        {session && (step === "FORM" || step === "PIN") && (
          <div className={styles.walletLayout}>
            <aside className={styles.phoneCard}>
              <div className={styles.phoneTop}>
                {/* Hiển thị giờ hệ thống thực tế động */}
                <span>{currentTime || "00:00"}</span>
                <span>MoMo Demo</span>
                <span>100%</span>
              </div>

              <div className={styles.walletHeader}>
                <div className={styles.avatar}>XK</div>
                <div>
                  <span>Thanh toán cho</span>
                  <strong>XeKhachPT</strong>
                </div>
              </div>

              <div className={styles.moneyBox}>
                <span>Số tiền thanh toán</span>
                <strong>{formatCurrency(session.amount)}</strong>
                <small>Phí giao dịch: 0 đ</small>
              </div>

              <div className={styles.walletInfo}>
                <div>
                  <span>Mã đặt vé</span>
                  <strong className={styles.monoText}>
                    {session.bookingCode}
                  </strong>
                </div>
                <div>
                  <span>Mã giao dịch</span>
                  <strong className={styles.monoText}>
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
            </aside>

            <section className={styles.formCard}>
              {step === "FORM" && (
                <form onSubmit={handleVerify}>
                  <div className={styles.stepHeader}>
                    <span>1</span>
                    <div>
                      <h1>Đăng nhập ví demo</h1>
                      <p>Xác nhận số điện thoại và số tiền cần thanh toán.</p>
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span>Số điện thoại MoMo Demo</span>
                    <input
                      value={phoneNumber}
                      onChange={(event) =>
                        setPhoneNumber(
                          event.target.value.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      inputMode="numeric"
                      placeholder="0900000000"
                    />
                  </label>

                  <div className={styles.balanceCard}>
                    <div>
                      <span>Số dư ví demo</span>
                      <strong>{formatCurrency(DEMO_BALANCE)}</strong>
                    </div>
                    <div>
                      <span>Sau thanh toán</span>
                      <strong>
                        {formatCurrency(DEMO_BALANCE - session.amount)}
                      </strong>
                    </div>
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
                  </label>

                  <div className={styles.demoInfo}>
                    <strong>Thông tin kiểm thử</strong>
                    <span>Số điện thoại demo: 0900000000</span>
                    <span>Có thể dùng số điện thoại demo khác hợp lệ.</span>
                  </div>

                  {message && (
                    <div className={styles.errorMessage}>{message}</div>
                  )}

                  {/* 5. Chặn gửi dữ liệu lên form khi thông tin cơ bản không thỏa mãn quy chuẩn đầu vào */}
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={
                      isSubmitting ||
                      phoneNumber.length !== 10 ||
                      !amount ||
                      Number(amount) <= 0
                    }
                  >
                    {isSubmitting ? "Đang kiểm tra..." : "Tiếp tục"}
                  </button>
                </form>
              )}

              {step === "PIN" && (
                <form onSubmit={handleConfirm}>
                  <div className={styles.stepHeader}>
                    <span>2</span>
                    <div>
                      <h1>Xác nhận bằng PIN</h1>
                      <p>Nhập PIN demo để hoàn tất giao dịch.</p>
                    </div>
                  </div>

                  <div className={styles.confirmBox}>
                    <div>
                      <span>Số điện thoại</span>
                      <strong>{phoneNumber || session.customerPhone}</strong>
                    </div>
                    <div>
                      <span>Tổng thanh toán</span>
                      <strong>{formatCurrency(session.amount)}</strong>
                    </div>
                    <div>
                      <span>Nguồn tiền</span>
                      <strong>Ví MoMo Demo</strong>
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span>PIN MoMo Demo</span>
                    <input
                      className={styles.pinInput}
                      value={pin}
                      onChange={(event) =>
                        setPin(
                          event.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      inputMode="numeric"
                      type="password"
                      placeholder="••••••" // 4. Đã sửa placeholder hiển thị đủ 6 ký tự bảo mật mật khẩu
                    />
                  </label>

                  <div className={styles.pinHint}>
                    <span>PIN kiểm thử</span>
                    <strong>000000</strong>
                  </div>

                  {message && (
                    <div className={styles.errorMessage}>{message}</div>
                  )}

                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting || pin.length !== 6}
                  >
                    Thanh toán
                  </button>

                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={() => {
                      setPin("");
                      setMessage("");
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
          <StateCard
            title="Đang xử lý thanh toán"
            message="MoMo Demo đang xác nhận số dư và hoàn tất giao dịch."
            loading
          />
        )}

        {step === "SUCCESS" && session && (
          <section className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>
            <h1>Thanh toán thành công</h1>
            <p>
              Giao dịch MoMo Demo đã được xác nhận. Trang đặt vé sẽ tự cập nhật
              trạng thái.
            </p>

            <div className={styles.successDetails}>
              <div>
                <span>Mã đặt vé</span>
                <strong>{session.bookingCode}</strong>
              </div>
              <div>
                <span>Số điện thoại</span>
                <strong>{phoneNumber}</strong>
              </div>
              <div>
                <span>Số tiền</span>
                <strong>{formatCurrency(session.amount)}</strong>
              </div>
              <div>
                <span>Số dư còn lại</span>
                <strong>{formatCurrency(DEMO_BALANCE - session.amount)}</strong>
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
        <div className={styles.errorIcon}>{props.error ? "!" : "✓"}</div>
      )}
      <h2>{props.title}</h2>
      <p>{props.message}</p>
    </section>
  );
}
