"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff, ShieldCheck, Lock, Check, X } from "lucide-react";

import { useChangePassword } from "@/hooks/client/useAccount";

import styles from "./ChangePasswordContainer.module.css";

// Regex kiểm tra các điều kiện mật khẩu
const PASSWORD_REGEX = {
  minLength: /.{8,}/,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
};

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function ChangePasswordContainer() {
  const mutation = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isTouched, setIsTouched] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Kiểm tra từng điều kiện của mật khẩu mới
  const passwordCriteria = {
    length: PASSWORD_REGEX.minLength.test(newPassword),
    uppercase: PASSWORD_REGEX.uppercase.test(newPassword),
    lowercase: PASSWORD_REGEX.lowercase.test(newPassword),
    number: PASSWORD_REGEX.number.test(newPassword),
    specialChar: PASSWORD_REGEX.specialChar.test(newPassword),
  };

  const isNewPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate Mật khẩu hiện tại
    if (!currentPassword.trim()) {
      newErrors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
    }

    // Validate Mật khẩu mới
    if (!newPassword) {
      newErrors.newPassword = "Vui lòng nhập mật khẩu mới.";
    } else if (!isNewPasswordValid) {
      newErrors.newPassword = "Mật khẩu mới chưa đạt yêu cầu bảo mật.";
    } else if (currentPassword && currentPassword === newPassword) {
      newErrors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại.";
    }

    // Validate Xác nhận mật khẩu
    if (!confirmPassword) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu mới.";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Mark tất cả trường là đã tương tác để hiện lỗi đầy đủ
    setIsTouched({ current: true, new: true, confirm: true });

    if (!validate()) {
      toast.error("Vui lòng kiểm tra lại thông tin nhập vào.");
      return;
    }

    try {
      await mutation.mutateAsync({
        currentPassword,
        newPassword,
      });

      toast.success("Đổi mật khẩu thành công.");

      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      setIsTouched({ current: false, new: false, confirm: false });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ??
          error?.message ??
          "Không thể đổi mật khẩu.",
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !mutation.isPending) {
      handleSubmit();
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Đổi mật khẩu</h1>

      <div className={styles.card}>
        <div className={styles.notice}>
          <ShieldCheck size={20} />
          <div>
            <strong>Bảo mật tài khoản</strong>
            <p>
              Mật khẩu mới cần đáp ứng đầy đủ các tiêu chuẩn an toàn bên dưới.
            </p>
          </div>
        </div>

        {/* 1. Mật khẩu hiện tại */}
        <div className={styles.inputGroup}>
          <label htmlFor="current-password">Mật khẩu hiện tại</label>
          <div
            className={`${styles.passwordInput} ${errors.currentPassword && isTouched.current ? styles.hasError : ""}`}
          >
            <input
              id="current-password"
              type={showCurrent ? "text" : "password"}
              placeholder="Nhập mật khẩu hiện tại"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword)
                  setErrors((prev) => ({
                    ...prev,
                    currentPassword: undefined,
                  }));
              }}
              onBlur={() =>
                setIsTouched((prev) => ({ ...prev, current: true }))
              }
              onKeyDown={handleKeyDown}
            />
            <button type="button" onClick={() => setShowCurrent((v) => !v)}>
              {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.currentPassword && isTouched.current && (
            <span className={styles.errorText}>{errors.currentPassword}</span>
          )}
        </div>

        {/* 2. Mật khẩu mới */}
        <div className={styles.inputGroup}>
          <label htmlFor="new-password">Mật khẩu mới</label>
          <div
            className={`${styles.passwordInput} ${errors.newPassword && isTouched.new ? styles.hasError : ""}`}
          >
            <input
              id="new-password"
              type={showNew ? "text" : "password"}
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword)
                  setErrors((prev) => ({ ...prev, newPassword: undefined }));
              }}
              onBlur={() => setIsTouched((prev) => ({ ...prev, new: true }))}
              onKeyDown={handleKeyDown}
            />
            <button type="button" onClick={() => setShowNew((v) => !v)}>
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {errors.newPassword && isTouched.new && (
            <span className={styles.errorText}>{errors.newPassword}</span>
          )}

          {/* Checklist tiêu chuẩn mật khẩu */}
          <div className={styles.checklist}>
            <div className={passwordCriteria.length ? styles.valid : ""}>
              {passwordCriteria.length ? <Check size={14} /> : <X size={14} />}
              <span>Tối thiểu 8 ký tự</span>
            </div>
            <div className={passwordCriteria.uppercase ? styles.valid : ""}>
              {passwordCriteria.uppercase ? (
                <Check size={14} />
              ) : (
                <X size={14} />
              )}
              <span>Ít nhất 1 chữ hoa (A-Z)</span>
            </div>
            <div className={passwordCriteria.lowercase ? styles.valid : ""}>
              {passwordCriteria.lowercase ? (
                <Check size={14} />
              ) : (
                <X size={14} />
              )}
              <span>Ít nhất 1 chữ thường (a-z)</span>
            </div>
            <div className={passwordCriteria.number ? styles.valid : ""}>
              {passwordCriteria.number ? <Check size={14} /> : <X size={14} />}
              <span>Ít nhất 1 chữ số (0-9)</span>
            </div>
            <div className={passwordCriteria.specialChar ? styles.valid : ""}>
              {passwordCriteria.specialChar ? (
                <Check size={14} />
              ) : (
                <X size={14} />
              )}
              <span>Ít nhất 1 ký tự đặc biệt (!@#$...)</span>
            </div>
          </div>
        </div>

        {/* 3. Xác nhận mật khẩu mới */}
        <div className={styles.inputGroup}>
          <label htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
          <div
            className={`${styles.passwordInput} ${errors.confirmPassword && isTouched.confirm ? styles.hasError : ""}`}
          >
            <input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword)
                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
              }}
              onBlur={() =>
                setIsTouched((prev) => ({ ...prev, confirm: true }))
              }
              onKeyDown={handleKeyDown}
            />
            <button type="button" onClick={() => setShowConfirm((v) => !v)}>
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && isTouched.confirm && (
            <span className={styles.errorText}>{errors.confirmPassword}</span>
          )}
        </div>

        {/* Nút Submit */}
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={
            mutation.isPending ||
            !currentPassword ||
            !newPassword ||
            !confirmPassword ||
            !isNewPasswordValid
          }
        >
          {mutation.isPending ? (
            <>
              <span className={styles.spinner} />
              Đang cập nhật...
            </>
          ) : (
            <>
              <Lock size={18} />
              Đổi mật khẩu
            </>
          )}
        </button>
      </div>
    </div>
  );
}
