"use client";

import { useState, useMemo, useEffect, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./VnpayDemo.module.css";

type BankItem = {
  id: string;
  name: string;
  shortName: string;
  logoText: string;
};

type Step =
  | "LOADING"
  | "SELECT_METHOD"
  | "BANK_AUTH"
  | "OTP_AUTH"
  | "PROCESSING"
  | "SUCCESS"
  | "ERROR"
  | "EXPIRED";

const BANK_DATA: BankItem[] = [
  {
    id: "VCB",
    name: "Ngân hàng TMCP Ngoại Thương Việt Nam",
    shortName: "Vietcombank",
    logoText: "VCB",
  },
  {
    id: "TCB",
    name: "Ngân hàng TMCP Kỹ Thương Việt Nam",
    shortName: "Techcombank",
    logoText: "TCB",
  },
  {
    id: "BIDV",
    name: "Ngân hàng TMCP Đầu tư và Phát triển VN",
    shortName: "BIDV",
    logoText: "BIDV",
  },
  {
    id: "CTG",
    name: "Ngân hàng TMCP Công Thương Việt Nam",
    shortName: "VietinBank",
    logoText: "CTG",
  },
  {
    id: "MB",
    name: "Ngân hàng TMCP Quân Đội",
    shortName: "MBBank",
    logoText: "MB",
  },
  {
    id: "ACB",
    name: "Ngân hàng TMCP Á Châu",
    shortName: "ACB",
    logoText: "ACB",
  },
  {
    id: "VPB",
    name: "Ngân hàng TMCP Việt Nam Thịnh Vượng",
    shortName: "VPBank",
    logoText: "VPB",
  },
  {
    id: "TPB",
    name: "Ngân hàng TMCP Tiên Phong",
    shortName: "TPBank",
    logoText: "TPB",
  },
  {
    id: "STB",
    name: "Ngân hàng TMCP Sài Gòn Thương Tín",
    shortName: "Sacombank",
    logoText: "STB",
  },
  {
    id: "AGR",
    name: "Ngân hàng Nông nghiệp & Phát triển Nông thôn",
    shortName: "Agribank",
    logoText: "AGR",
  },
  {
    id: "VIB",
    name: "Ngân hàng TMCP Quốc Tế Việt Nam",
    shortName: "VIB",
    logoText: "VIB",
  },
  {
    id: "SHB",
    name: "Ngân hàng TMCP Sài Gòn - Hà Nội",
    shortName: "SHB",
    logoText: "SHB",
  },
];
type DemoSessionResponse = {
  bookingCode: string;
  transactionCode: string;
  amount: number;
  expiredAt: string;
  provider: "VNPAY";
  status: string;
  paymentStatus: string;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
};
export default function VnpayDemo() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [step, setStep] = useState<Step>("LOADING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBank, setSelectedBank] = useState<BankItem | null>(null);

  // Dữ liệu lấy động từ API Session
  const [sessionData, setSessionData] = useState<{
    bookingCode: string;
    transactionCode: string;
    amount: number;
    expiredAt: string;
  } | null>(null);

  // Form inputs công khai
  const [amountInput, setAmountInput] = useState(""); // Khắc phục thiếu ô nhập số tiền đối chiếu
  const [cardHolder, setCardHolder] = useState("NGUYEN VAN A");
  const [cardNumber, setCardNumber] = useState("9704000000000000");
  const [cardDate, setCardDate] = useState("07/26");
  const [otp, setOtp] = useState("");

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Tải thông tin Session từ Backend khi vừa vào trang
  useEffect(() => {
    if (!token) {
      setErrorMsg("Mã cấu hình thanh toán không hợp lệ hoặc đã hết hạn.");
      setStep("ERROR");
      return;
    }

    async function fetchSession() {
      try {
        const res = await fetch(
          `/api/client/payments/demo-payment/session?token=${encodeURIComponent(
            token,
          )}`,
          {
            cache: "no-store",
          },
        );

        const result = (await res.json()) as ApiResponse<DemoSessionResponse>;

        if (!res.ok || !result.data) {
          throw new Error(
            result.message || "Không thể tìm thấy phiên thanh toán này.",
          );
        }

        const session = result.data;

        if (session.provider !== "VNPAY") {
          throw new Error("Phiên thanh toán không thuộc VNPay.");
        }

        setSessionData({
          bookingCode: session.bookingCode,
          transactionCode: session.transactionCode,
          amount: Number(session.amount),
          expiredAt: session.expiredAt,
        });

        setAmountInput(String(session.amount));

        const diffMs = new Date(session.expiredAt).getTime() - Date.now();

        const seconds = Math.max(0, Math.ceil(diffMs / 1000));

        if (seconds <= 0) {
          setStep("EXPIRED");
          return;
        }

        setRemainingSeconds(seconds);

        if (session.status === "SUCCESS" || session.paymentStatus === "PAID") {
          setStep("SUCCESS");
          return;
        }

        setStep("SELECT_METHOD");
      } catch (error: unknown) {
        setErrorMsg(
          error instanceof Error
            ? error.message
            : "Lỗi tải dữ liệu phiên làm việc.",
        );

        setStep("ERROR");
      }
    }

    fetchSession();
  }, [token]);

  // Bộ lọc danh sách ngân hàng
  const filteredBanks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return BANK_DATA;
    return BANK_DATA.filter(
      (b) =>
        b.name.toLowerCase().includes(query) ||
        b.shortName.toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  // Bộ đếm thời gian phiên làm việc dựa trên giây thực tế
  useEffect(() => {
    if (
      step === "SUCCESS" ||
      step === "EXPIRED" ||
      step === "ERROR" ||
      step === "LOADING"
    )
      return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStep("EXPIRED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // Sửa lỗi hiển thị thời gian Math.floor (ví dụ 61s -> 01:01, không phải 02:01)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // 2. Xử lý bước Verify thông tin thẻ và số tiền nhập vào lên Backend
  const handleBankSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBank || isSubmitting) return;

    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/client/payments/demo-payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          provider: "VNPAY",
          bankCode: selectedBank.id,
          amount: Number(amountInput),
          cardNumber,
          cardHolder,
          cardDate,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Thông tin xác thực thẻ không hợp lệ.");

      setStep("OTP_AUTH");
    } catch (err: any) {
      setErrorMsg(err.message || "Xảy ra lỗi trong quá trình xác thực thẻ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Xử lý bước Confirm OTP lên Backend để chính thức chuyển đổi trạng thái đơn hàng
  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Sửa mã kiểm thử frontend theo đúng tài liệu VNPay Sandbox (123456)
    if (otp !== "123456") {
      setErrorMsg(
        "Mã OTP thử nghiệm không đúng (Mã chuẩn VNPay Sandbox: 123456).",
      );
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);
    setStep("PROCESSING");

    try {
      const res = await fetch("/api/client/payments/demo-payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          provider: "VNPAY",
          verificationCode: otp,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.message || "Xác nhận mã OTP thất bại từ hệ thống.",
        );

      setStep("SUCCESS");
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi xử lý hoàn tất giao dịch.");
      setStep("OTP_AUTH");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.wrapper}>
      {/* Thanh tiêu đề chính */}
      <header className={styles.mainHeader}>
        <div className={styles.headerContainer}>
          <div className={styles.logoArea}>
            <span className={styles.vnpayText}>VN</span>
            <span className={styles.payText}>PAY</span>
            <span className={styles.sandboxBadge}>SANDBOX</span>
          </div>
          {step !== "LOADING" &&
            step !== "ERROR" &&
            step !== "SUCCESS" &&
            step !== "EXPIRED" && (
              <div className={styles.timerZone}>
                Thời gian giữ đơn hàng:{" "}
                <span
                  className={`${styles.clock} ${remainingSeconds < 60 ? styles.clockAlert : ""}`}
                >
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            )}
        </div>
      </header>

      <div className={styles.layoutContainer}>
        {/* Khối bên trái: Tóm tắt thông tin hóa đơn động */}
        <aside className={styles.sidebar}>
          <div className={styles.summaryCard}>
            <div className={styles.merchantMeta}>
              <div className={styles.merchantIcon}>🚌</div>
              <div>
                <p className={styles.metaLabel}>Nhà cung cấp dịch vụ</p>
                {/* Sửa đổi thương hiệu chuẩn dự án */}
                <h3 className={styles.metaValue}>Hệ thống đặt vé XeKhachPT</h3>
              </div>
            </div>
            <div className={styles.divider} />

            {sessionData ? (
              <>
                <div className={styles.dataRow}>
                  <span>Mã đơn hàng:</span>
                  <strong className={styles.monoText}>
                    {sessionData.bookingCode}
                  </strong>
                </div>
                <div className={styles.dataRow}>
                  <span>Nội dung:</span>
                  <span>Thanh toan ve xe chat luong cao qua VNPay</span>
                </div>
                <div className={styles.divider} />
                <div className={styles.totalPriceSection}>
                  <span className={styles.totalLabel}>Số tiền thanh toán</span>
                  <h2 className={styles.totalAmount}>
                    {sessionData.amount.toLocaleString("vi-VN")} đ
                  </h2>
                </div>
              </>
            ) : (
              <p className={styles.loadingText}>
                Đang tải thông tin đơn hàng...
              </p>
            )}
          </div>

          <div className={styles.securityNotice}>
            🔒 Kết nối được mã hóa giả lập. Tuyệt đối không nhập thông tin thẻ
            ngân hàng thật của bạn vào đây.
          </div>
        </aside>

        {/* Khối bên phải: Xử lý quy trình trạng thái */}
        <section className={styles.mainContent}>
          {step === "LOADING" && (
            <div className={`${styles.panel} ${styles.centerPanel}`}>
              <div className={styles.circleLoader} />
              <h3>Đang khởi tạo cổng thanh toán...</h3>
            </div>
          )}

          {step === "ERROR" && (
            <div className={`${styles.panel} ${styles.centerPanel}`}>
              <div className={styles.errorIconBadge}>!</div>
              <h2>Giao dịch không hợp lệ</h2>
              <p className={styles.errorTextMsg}>{errorMsg}</p>
              <button
                className={styles.primaryActionBtn}
                onClick={() => router.push("/")}
              >
                Quay về trang chủ
              </button>
            </div>
          )}

          {step === "SELECT_METHOD" && (
            <div className={styles.panel}>
              {/* Đã loại bỏ luồng tab QR bị trùng lặp nghiệp vụ, tập trung trực tiếp vào thẻ nội địa */}
              <h2 className={styles.panelTitle}>
                Thẻ nội địa và Tài khoản ngân hàng
              </h2>

              <div className={styles.bankFlowArea}>
                <label className={styles.fieldTitle}>
                  Tìm kiếm hoặc chọn ngân hàng phát hành:
                </label>

                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    className={styles.searchBar}
                    placeholder="🔍 Nhập tên ngân hàng hoặc mã viết tắt (ví dụ: VCB, Techcombank...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className={styles.bankGridScroll}>
                  {filteredBanks.map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      className={`${styles.bankGridItem} ${selectedBank?.id === bank.id ? styles.bankGridItemActive : ""}`}
                      onClick={() => setSelectedBank(bank)}
                    >
                      <div className={styles.bankLogoBox}>{bank.logoText}</div>
                      <span className={styles.bankNameLabel}>
                        {bank.shortName}
                      </span>
                    </button>
                  ))}
                  {filteredBanks.length === 0 && (
                    <div className={styles.noData}>
                      Không tìm thấy ngân hàng khớp với từ khóa.
                    </div>
                  )}
                </div>

                <button
                  className={styles.primaryActionBtn}
                  disabled={!selectedBank}
                  onClick={() => setStep("BANK_AUTH")}
                >
                  {selectedBank
                    ? `Tiếp tục với ${selectedBank.shortName}`
                    : "Vui lòng chọn ngân hàng"}
                </button>
              </div>
            </div>
          )}

          {step === "BANK_AUTH" && selectedBank && (
            <div className={styles.panel}>
              <div
                className={styles.backNav}
                onClick={() => setStep("SELECT_METHOD")}
              >
                ← Chọn lại ngân hàng
              </div>
              <h2 className={styles.panelTitle}>
                Thông tin xác thực tài khoản {selectedBank.shortName}
              </h2>

              <form onSubmit={handleBankSubmit} className={styles.formLayout}>
                {/* Khắc phục lỗi thiếu trường nhập số tiền đối chiếu */}
                <div className={styles.formGroup}>
                  <label>Số tiền cần đối chiếu (đ)</label>
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Số thẻ định danh test</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="9704..."
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Tên chủ thẻ (Không dấu)</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) =>
                      setCardHolder(e.target.value.toUpperCase())
                    }
                    placeholder="NGUYEN VAN A"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Ngày phát hành (MM/YY)</label>
                  <input
                    type="text"
                    value={cardDate}
                    onChange={(e) => setCardDate(e.target.value)}
                    placeholder="07/26"
                    required
                  />
                </div>

                <div className={styles.sandboxTipsCard}>
                  💡 <strong>Thông tin kiểm thử hệ thống:</strong> Bạn có thể
                  giữ thông tin thẻ mặc định và chỉnh sửa số tiền khớp với hóa
                  đơn để gửi dữ liệu đối chiếu lên backend.
                </div>

                {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

                <button
                  type="submit"
                  className={styles.primaryActionBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang xử lý..." : "Xác thực chủ thẻ"}
                </button>
              </form>
            </div>
          )}

          {step === "OTP_AUTH" && selectedBank && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>
                Xác thực mã khóa OTP giao dịch
              </h2>
              <p className={styles.panelSubtitle}>
                Hệ thống Sandbox vừa gửi mã OTP giả lập cho giao dịch liên kết
                tại mạng lưới <strong>{selectedBank.shortName}</strong>.
              </p>

              <form onSubmit={handleOtpSubmit} className={styles.formLayout}>
                <div className={styles.formGroup}>
                  <label>Nhập mã OTP</label>
                  <input
                    type="text"
                    className={styles.otpInputBox}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>

                <div className={styles.otpGatewayAlert}>
                  🔑 Nhập mã OTP Sandbox tiêu chuẩn:{" "}
                  <strong className={styles.highlightOtp}>123456</strong>
                </div>

                {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

                <button
                  type="submit"
                  className={styles.primaryActionBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Đang gửi xác nhận..."
                    : "Xác nhận thanh toán hoàn tất"}
                </button>
              </form>
            </div>
          )}

          {step === "PROCESSING" && (
            <div className={`${styles.panel} ${styles.centerPanel}`}>
              <div className={styles.circleLoader} />
              <h3>Đang xác minh kết quả giao dịch...</h3>
              <p>
                Hệ thống XeKhachPT đang đồng bộ trạng thái thanh toán và cập
                nhật chỗ ngồi của bạn, xin vui lòng không đóng hoặc tải lại
                trang.
              </p>
            </div>
          )}

          {step === "SUCCESS" && (
            <div className={`${styles.panel} ${styles.centerPanel}`}>
              <div className={styles.successIconBadge}>✓</div>
              <h2 className={styles.successTitleText}>
                Thanh toán thành công!
              </h2>
              <p>
                Giao dịch của bạn đã xử lý thành công. Hệ thống đang tiến hành
                chuyển hướng hoặc bạn có thể đóng trình duyệt.
              </p>

              <div className={styles.receiptDetails}>
                <div className={styles.receiptRow}>
                  <span>Ngân hàng thanh toán:</span>
                  <strong>{selectedBank?.shortName}</strong>
                </div>
                <div className={styles.receiptRow}>
                  <span>Mã tham chiếu đối tác:</span>
                  <strong className={styles.monoText}>
                    {sessionData?.transactionCode}
                  </strong>
                </div>
                <div className={styles.receiptRow}>
                  <span>Số tiền thanh toán:</span>
                  <strong className={styles.greenText}>
                    {(sessionData?.amount ?? 0).toLocaleString("vi-VN")} đ
                  </strong>
                </div>
              </div>

              <button
                className={styles.primaryActionBtn}
                onClick={() => router.push("/")}
              >
                Quay lại trang chủ hệ thống
              </button>
            </div>
          )}

          {step === "EXPIRED" && (
            <div className={`${styles.panel} ${styles.centerPanel}`}>
              <div className={styles.errorIconBadge}>!</div>
              <h2>Phiên giao dịch hết hạn</h2>
              <p>
                Thời gian thực hiện thanh toán cho đơn hàng này đã kết thúc. Vui
                lòng quay lại màn hình chính của ứng dụng đặt vé xe khách để
                khởi tạo lại luồng đơn hàng mới.
              </p>
              <button
                className={styles.primaryActionBtn}
                onClick={() => router.push("/")}
              >
                Quay về trang chủ
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
