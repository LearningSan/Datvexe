"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./WalletDeposit.module.css";

import {
  useCreateWalletTopup,
  useMyWallet,
  useWalletTopupStatus,
} from "@/hooks/client/useWallet";
import { useAuthStore } from "@/store/auth.store";
import type { CreateWalletTopupResponse } from "@/types/client/wallet/wallet.type";

const SUGGESTED_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000];
const MIN_TOPUP_AMOUNT = 10_000;
const MAX_TOPUP_AMOUNT = 5_000_000;

type DepositStep = "INPUT" | "PAYMENT" | "SUCCESS" | "FAILED" | "EXPIRED";

// --- HELPER FUNCTIONS ---

function isDirectQrImageUrl(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.startsWith("data:image/") ||
    normalized.includes("api.qrserver.com/") ||
    normalized.includes("img.vietqr.io/") ||
    /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(value)
  );
}

function buildQrImageUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  if (isDirectQrImageUrl(value)) {
    return value;
  }
  return (
    "https://api.qrserver.com/v1/create-qr-code/" +
    `?size=340x340&margin=12&data=${encodeURIComponent(value)}`
  );
}

function formatCurrency(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatNumberInput(value: string) {
  const numeric = Number(value.replace(/\D/g, "") || 0);
  if (!numeric) {
    return "";
  }
  return numeric.toLocaleString("vi-VN");
}

function formatRemainingTime(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remain = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, any>;
    const apiMessage = record.response?.data?.message;
    if (typeof apiMessage === "string") {
      return apiMessage;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

// --- SUB-COMPONENT ---

interface ResultErrorProps {
  title: string;
  message: string;
  onRetry: () => void;
}

function ResultError({ title, message, onRetry }: ResultErrorProps) {
  return (
    <section className={styles.stateCard}>
      <div className={styles.errorIcon}>!</div>
      <h1>{title}</h1>
      <p>{message}</p>
      <button type="button" className={styles.primaryButton} onClick={onRetry}>
        Tạo giao dịch mới
      </button>
    </section>
  );
}

// --- MAIN COMPONENT ---

export default function WalletDeposit() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const {
    data: wallet,
    isLoading: walletIsLoading,
    isError: walletIsError,
    refetch: refetchWallet,
  } = useMyWallet(Boolean(user));

  const createTopup = useCreateWalletTopup();

  const [amountInput, setAmountInput] = useState("");
  const [topup, setTopup] = useState<CreateWalletTopupResponse | null>(null);
  const [step, setStep] = useState<DepositStep>("INPUT");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [formError, setFormError] = useState("");

  const topupStatusQuery = useWalletTopupStatus(
    topup?.topupId ?? null,
    step === "PAYMENT",
  );

  // 1. Kiểm tra xác thực của người dùng
  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

  // 2. Theo dõi trạng thái của giao dịch nạp tiền
  useEffect(() => {
    const status = topupStatusQuery.data?.status;
    if (!status) {
      return;
    }

    if (status === "SUCCESS") {
      setStep("SUCCESS");
      void refetchWallet();
      return;
    }

    if (status === "FAILED" || status === "CANCELLED") {
      setStep("FAILED");
      return;
    }

    if (status === "EXPIRED") {
      setStep("EXPIRED");
    }
  }, [topupStatusQuery.data?.status, refetchWallet]);

  // 3. Xử lý đếm ngược thời gian thanh toán
  useEffect(() => {
    if (!topup || step !== "PAYMENT") {
      return;
    }

    const calculateSeconds = () => {
      const expiredTime = new Date(topup.expiredAt).getTime();
      if (!Number.isFinite(expiredTime)) {
        return 0;
      }
      return Math.max(Math.ceil((expiredTime - Date.now()) / 1000), 0);
    };

    const updateCountdown = () => {
      const seconds = calculateSeconds();
      setRemainingSeconds(seconds);
      if (seconds <= 0) {
        setStep("EXPIRED");
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [topup, step]);

  const numericAmount = useMemo(() => {
    const normalized = amountInput.replace(/\D/g, "");
    return Number(normalized || 0);
  }, [amountInput]);

  const qrImageUrl = buildQrImageUrl(topup?.qrCodeUrl);

  async function handleCreateTopup(event: FormEvent) {
    event.preventDefault();
    setFormError("");

    if (numericAmount < MIN_TOPUP_AMOUNT) {
      setFormError("Số tiền nạp tối thiểu là 10.000 đ.");
      return;
    }

    if (numericAmount > MAX_TOPUP_AMOUNT) {
      setFormError("Số tiền nạp tối đa mỗi lần là 5.000.000 đ.");
      return;
    }

    try {
      const result = await createTopup.mutateAsync({
        amount: numericAmount,
      });

      setTopup(result);

      const seconds = Math.max(
        Math.ceil((new Date(result.expiredAt).getTime() - Date.now()) / 1000),
        0,
      );

      setRemainingSeconds(seconds);
      setStep("PAYMENT");
    } catch (error) {
      setFormError(getErrorMessage(error, "Không thể tạo giao dịch nạp ví."));
    }
  }

  function resetTopup() {
    setTopup(null);
    setAmountInput("");
    setFormError("");
    setRemainingSeconds(0);
    setStep("INPUT");
  }

  // --- RENDER STATES ---

  if (!user || walletIsLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>
          <div className={styles.spinner} />
          <h2>Đang tải ví</h2>
          <p>Hệ thống đang kiểm tra thông tin tài khoản.</p>
        </div>
      </main>
    );
  }

  if (walletIsError || !wallet) {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>
          <div className={styles.errorIcon}>!</div>
          <h2>Không thể tải thông tin ví</h2>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              void refetchWallet();
            }}
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Header bar chung */}
        <div className={styles.topBar}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => router.push("/account/wallet")}
          >
            ← Quay lại ví
          </button>

          <div>
            <span className={styles.eyebrow}>Ví XeKhachPT</span>
            <h1>Nạp tiền vào ví</h1>
            <p>
              Quét mã PayOS bằng ứng dụng ngân hàng. Số dư chỉ được cộng sau khi
              PayOS xác nhận thanh toán thành công.
            </p>
          </div>
        </div>

        {/* BƯỚC 1: NHẬP SỐ TIỀN */}
        {step === "INPUT" && (
          <div className={styles.layout}>
            <aside className={styles.walletCard}>
              <span>Số dư hiện tại</span>
              <strong>{formatCurrency(wallet.balance)}</strong>

              <div className={styles.walletStatus}>
                <span>Trạng thái</span>
                <b>
                  {wallet.status === "ACTIVE"
                    ? "Đang hoạt động"
                    : "Đang bị khóa"}
                </b>
              </div>

              <div className={styles.walletInformation}>
                Tiền nạp thành công có thể được sử dụng để thanh toán vé bằng
                phương thức Ví nội bộ.
              </div>
            </aside>

            <section className={styles.formCard}>
              <form onSubmit={handleCreateTopup}>
                <h2>Chọn số tiền muốn nạp</h2>
                <p className={styles.formDescription}>
                  Chọn một mức gợi ý hoặc nhập số tiền tùy chỉnh.
                </p>

                <div className={styles.suggestedGrid}>
                  {SUGGESTED_AMOUNTS.map((amount) => {
                    const active = numericAmount === amount;
                    return (
                      <button
                        key={amount}
                        type="button"
                        className={`${styles.suggestedButton} ${
                          active ? styles.suggestedActive : ""
                        }`}
                        onClick={() => {
                          setAmountInput(String(amount));
                          setFormError("");
                        }}
                      >
                        {formatCurrency(amount)}
                      </button>
                    );
                  })}
                </div>

                <label className={styles.field}>
                  <span>Số tiền tùy chỉnh</span>
                  <div className={styles.amountInput}>
                    <input
                      value={formatNumberInput(amountInput)}
                      onChange={(event) => {
                        setAmountInput(event.target.value.replace(/\D/g, ""));
                        setFormError("");
                      }}
                      inputMode="numeric"
                      placeholder="Nhập số tiền"
                    />
                    <strong>VND</strong>
                  </div>
                  <small>Từ 10.000 đ đến 5.000.000 đ mỗi lần nạp.</small>
                </label>

                <div className={styles.summaryBox}>
                  <div>
                    <span>Số tiền nạp</span>
                    <strong>{formatCurrency(numericAmount)}</strong>
                  </div>
                  <div>
                    <span>Phí giao dịch</span>
                    <strong>0 đ</strong>
                  </div>
                  <div>
                    <span>Số dư dự kiến</span>
                    <strong>
                      {formatCurrency(wallet.balance + numericAmount)}
                    </strong>
                  </div>
                </div>

                {formError && (
                  <div className={styles.errorMessage}>{formError}</div>
                )}

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={
                    createTopup.isPending ||
                    wallet.status !== "ACTIVE" ||
                    numericAmount <= 0
                  }
                >
                  {createTopup.isPending
                    ? "Đang tạo giao dịch..."
                    : "Tạo mã QR nạp tiền"}
                </button>
              </form>
            </section>
          </div>
        )}

        {/* BƯỚC 2: THANH TOÁN (QR CODE & CÔNG CỤ THEO DÕI GIAO DỊCH) */}
        {step === "PAYMENT" && topup && (
          <section className={styles.paymentCard}>
            <div className={styles.paymentHeader}>
              <div>
                <span>Giao dịch nạp ví</span>
                <h2>Quét mã QR bằng ứng dụng ngân hàng</h2>
              </div>
              <div className={styles.countdown}>
                {formatRemainingTime(remainingSeconds)}
              </div>
            </div>

            <div className={styles.paymentLayout}>
              <div className={styles.qrSection}>
                {qrImageUrl ? (
                  <div className={styles.qrWrapper}>
                    <img
                      src={qrImageUrl}
                      alt="QR nạp tiền ví bằng PayOS"
                      className={styles.qrImage}
                    />
                    <div className={styles.payosBadge}>PayOS</div>
                  </div>
                ) : (
                  <div className={styles.qrError}>
                    PayOS không trả dữ liệu QR.
                  </div>
                )}
                <p>
                  Mở ứng dụng ngân hàng, chọn quét QR và xác nhận đúng số tiền.
                </p>
              </div>

              <div className={styles.topupDetails}>
                <div>
                  <span>Mã giao dịch</span>
                  <strong className={styles.code}>
                    {topup.transactionCode}
                  </strong>
                </div>

                <div>
                  <span>Số tiền nạp</span>
                  <strong className={styles.topupAmount}>
                    {formatCurrency(topup.amount)}
                  </strong>
                </div>

                <div>
                  <span>Trạng thái</span>
                  <strong className={styles.pendingStatus}>
                    Đang chờ thanh toán
                  </strong>
                </div>

                <ol className={styles.guideList}>
                  <li>Mở ứng dụng ngân hàng.</li>
                  <li>Chọn chức năng quét QR.</li>
                  <li>Kiểm tra số tiền.</li>
                  <li>Xác nhận thanh toán.</li>
                  <li>Giữ nguyên trang này để hệ thống cập nhật số dư.</li>
                </ol>

                {topupStatusQuery.isError && (
                  <div className={styles.warningMessage}>
                    Tạm thời chưa kiểm tra được trạng thái nạp tiền.{" "}
                    <button
                      type="button"
                      onClick={() => {
                        void topupStatusQuery.refetch();
                      }}
                    >
                      Kiểm tra lại
                    </button>
                  </div>
                )}

                {topup.paymentUrl && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      window.open(
                        topup.paymentUrl!,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    Mở trang PayOS
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* BƯỚC 3: THÀNH CÔNG */}
        {step === "SUCCESS" && topup && (
          <section className={styles.stateCard}>
            <div className={styles.successIcon}>✓</div>
            <h1>Nạp tiền thành công</h1>
            <p>
              PayOS đã xác nhận giao dịch. Số dư ví XeKhachPT của bạn đã được
              cập nhật.
            </p>

            <div className={styles.resultDetails}>
              <div>
                <span>Số tiền đã nạp</span>
                <strong>{formatCurrency(topup.amount)}</strong>
              </div>
              <div>
                <span>Mã giao dịch</span>
                <strong>{topup.transactionCode}</strong>
              </div>
            </div>

            <div className={styles.resultActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => router.push("/account/wallet")}
              >
                Xem số dư ví
              </button>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={resetTopup}
              >
                Nạp thêm tiền
              </button>
            </div>
          </section>
        )}

        {/* BƯỚC KHÁC: THẤT BẠI */}
        {step === "FAILED" && (
          <ResultError
            title="Nạp tiền không thành công"
            message="Giao dịch đã bị hủy hoặc PayOS từ chối thanh toán."
            onRetry={resetTopup}
          />
        )}

        {/* BƯỚC KHÁC: HẾT HẠN */}
        {step === "EXPIRED" && (
          <ResultError
            title="Giao dịch đã hết hạn"
            message="Mã QR nạp tiền không còn hiệu lực. Vui lòng tạo giao dịch mới."
            onRetry={resetTopup}
          />
        )}
      </div>
    </main>
  );
}
