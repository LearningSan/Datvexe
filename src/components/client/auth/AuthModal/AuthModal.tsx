"use client";

import { useRef, useState, useEffect } from "react";
import styles from "./AuthModal.module.css";
import {
  useLogin,
  useRegister,
  useVerifyEmailOtp,
} from "@/hooks/client/useAuth";

interface Props {
  onClose: () => void;
}

function isEmail(value: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value.trim());
}

function isPhone(value: string): boolean {
  const phone = value.replace(/\s+/g, "");
  return (
    /^(\+84|84|0)(3|5|7|8|9)\d{8}$/.test(phone) ||
    /^\+[1-9]\d{7,14}$/.test(phone)
  );
}

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<"login" | "register" | "otp">("login");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
  });

  const [localError, setLocalError] = useState("");

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const verifyEmailOtpMutation = useVerifyEmailOtp();

  useEffect(() => {
    setPasswordCriteria({
      length: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    });
  }, [password]);

  const strengthScore = Object.values(passwordCriteria).filter(Boolean).length;

  const getStrengthText = () => {
    if (password.length === 0) return "";
    if (strengthScore <= 2) return "Yếu";
    if (strengthScore <= 4) return "Trung bình";
    return "Mạnh cực kỳ 🔥";
  };

  const handleLogin = async () => {
    setLocalError("");
    try {
      await loginMutation.mutateAsync({
        identifier: identifier.trim(),
        password,
      });
      onClose();
    } catch (error: any) {
      setLocalError(error?.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  const handleRegister = async () => {
    setLocalError("");
    if (!fullName.trim())
      return setLocalError("Vui lòng bổ sung họ tên của bạn");
    if (!isEmail(email))
      return setLocalError("Địa chỉ định dạng Email không hợp lệ");
    if (!isPhone(phone))
      return setLocalError("Số điện thoại chưa đúng định dạng");
    if (strengthScore < 4)
      return setLocalError("Mật khẩu chưa đạt độ bảo mật an toàn");

    try {
      await registerMutation.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });
      setMode("otp");
    } catch (error: any) {
      setLocalError(error?.response?.data?.message || "Đăng ký thất bại");
    }
  };

  const handleConfirmOtpAndRegister = async () => {
    setLocalError("");
    if (!otp.trim()) return setLocalError("Vui lòng nhập mã OTP");

    try {
      await verifyEmailOtpMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      setMode("login");
      setLocalError("Xác thực thành công! Hãy đăng nhập tài khoản mới.");
    } catch (error: any) {
      setLocalError(
        error?.response?.data?.message || "Mã OTP không chính xác hoặc hết hạn",
      );
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close modal"
        >
          &times;
        </button>

        {localError && <div className={styles.errorBanner}>{localError}</div>}

        {mode === "login" && (
          <div className={styles.formView}>
            <div className={styles.header}>
              <h2>Chào mừng trở lại ✨</h2>
              <p>Hành trình mới đang chờ bạn, đăng nhập ngay nào</p>
            </div>

            <div className={styles.inputGroup}>
              <label>Tài khoản</label>
              <input
                type="text"
                placeholder="Nhập email hoặc số điện thoại..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Mật khẩu</label>
              <div className={styles.passwordWrapper}>
                <input
                  placeholder="Nhập mật khẩu của bạn"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </div>

            <button
              className={styles.primaryBtn}
              onClick={handleLogin}
              disabled={loginMutation.isPending}
            >
              <span>
                {loginMutation.isPending
                  ? "Đang kết nối..."
                  : "Đăng nhập hệ thống"}
              </span>
            </button>

            <div className={styles.divider}>
              <span>Hoặc liên kết nhanh qua</span>
            </div>

            <div className={styles.socialGroup}>
              <button
                type="button"
                className={`${styles.socialBtn} ${styles.google}`}
                onClick={() =>
                  (location.href = "/api/client/auth/oauth/google")
                }
              >
                Google
              </button>
              <button
                type="button"
                className={`${styles.socialBtn} ${styles.facebook}`}
                onClick={() =>
                  (location.href = "/api/client/auth/oauth/facebook")
                }
              >
                Facebook
              </button>
            </div>

            <p className={styles.footerText}>
              Bạn mới đến lần đầu?{" "}
              <button
                className={styles.linkBtn}
                onClick={() => setMode("register")}
              >
                Đăng ký tài khoản ngay
              </button>
            </p>
          </div>
        )}

        {mode === "register" && (
          <div className={styles.formView}>
            <div className={styles.header}>
              <h2>Tạo tài khoản mới 🚀</h2>
              <p>Khám phá hệ thống đặt vé nhanh chóng và tiện lợi</p>
            </div>

            <div className={styles.inputGroup}>
              <label>Họ và tên</label>
              <input
                placeholder="Ví dụ: Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Email liên hệ</label>
              <input
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Số điện thoại</label>
              <input
                type="tel"
                placeholder="Ví dụ: 0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Mật khẩu an toàn</label>
              <div className={styles.passwordWrapper}>
                <input
                  placeholder="Mật khẩu bảo mật cấp cao"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>

              {password.length > 0 && (
                <div className={styles.strengthContainer}>
                  <div className={styles.strengthBarBackground}>
                    <div
                      className={`${styles.strengthBarFill} ${styles[`score${strengthScore}`]}`}
                      style={{ width: `${(strengthScore / 5) * 100}%` }}
                    />
                  </div>
                  <span className={styles.strengthText}>
                    Cấp độ bảo vệ: <strong>{getStrengthText()}</strong>
                  </span>

                  <ul className={styles.criteriaList}>
                    <li
                      className={passwordCriteria.length ? styles.checked : ""}
                    >
                      Ký tự ≥ 8
                    </li>
                    <li
                      className={
                        passwordCriteria.hasUpper ? styles.checked : ""
                      }
                    >
                      Chữ HOA
                    </li>
                    <li
                      className={
                        passwordCriteria.hasLower ? styles.checked : ""
                      }
                    >
                      Chữ thường
                    </li>
                    <li
                      className={
                        passwordCriteria.hasNumber ? styles.checked : ""
                      }
                    >
                      Chữ số (0-9)
                    </li>
                    <li
                      className={
                        passwordCriteria.hasSpecial ? styles.checked : ""
                      }
                    >
                      Ký tự lạ (@,#,...)
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <button
              className={styles.primaryBtn}
              onClick={handleRegister}
              disabled={registerMutation.isPending}
            >
              <span>
                {registerMutation.isPending
                  ? "Đang khởi tạo..."
                  : "Đăng ký thành viên"}
              </span>
            </button>

            <p className={styles.footerText}>
              Đã có tài khoản từ trước?{" "}
              <button
                className={styles.linkBtn}
                onClick={() => setMode("login")}
              >
                Đăng nhập tại đây
              </button>
            </p>
          </div>
        )}

        {mode === "otp" && (
          <div className={styles.formView}>
            <div className={styles.header}>
              <h2>Xác thực Email 🛡️</h2>
              <p>
                Mã bảo mật vừa được gửi tới hộp thư điện tử: <br />
                <strong>{email.trim().toLowerCase()}</strong>
              </p>
            </div>

            <div className={styles.inputGroup}>
              <label>Nhập 6 ký số OTP</label>
              <input
                placeholder="******"
                value={otp}
                className={styles.otpInput}
                maxLength={6}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <button
              className={styles.primaryBtn}
              onClick={handleConfirmOtpAndRegister}
              disabled={verifyEmailOtpMutation.isPending}
            >
              <span>
                {verifyEmailOtpMutation.isPending
                  ? "Đang xác thực..."
                  : "Kích hoạt tài khoản"}
              </span>
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={() => setMode("register")}
            >
              Quay lại thay đổi thông tin
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
