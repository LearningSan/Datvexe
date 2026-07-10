"use client";

import { useEffect, useState } from "react";
import styles from "./UserFormModal.module.css";
import type { AdminUserItem } from "@/types/admin/users/user-management.type";

interface Props {
  open: boolean;
  mode: "CREATE" | "EDIT";
  user?: AdminUserItem | null;
  onClose: () => void;
  onSubmit: (payload: any) => void;
  loading?: boolean;
}

export default function UserFormModal({
  open,
  mode,
  user,
  onClose,
  onSubmit,
  loading,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
  }>({});

  useEffect(() => {
    if (!open) return;

    if (mode === "EDIT" && user) {
      setFullName(user.fullName);
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setPassword("");
    } else {
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
    }
    setErrors({}); // Reset lỗi mỗi lần đóng/mở modal
  }, [mode, user, open]);

  if (!open) return null;

  const validateForm = () => {
    const newErrors: typeof errors = {};

    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (!normalizedFullName) {
      newErrors.fullName = "Họ tên không được để trống.";
    }

    if (normalizedEmail) {
      const emailRegex =
        /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*[A-Za-z0-9_+-])@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

      if (!emailRegex.test(normalizedEmail)) {
        newErrors.email = "Email không hợp lệ. Ví dụ đúng: abc@gmail.com.";
      }
    }

    if (normalizedPhone) {
      const phoneRegex = /^(03|05|07|08|09)[0-9]{8}$/;

      if (!phoneRegex.test(normalizedPhone)) {
        newErrors.phone =
          "Số điện thoại Việt Nam phải gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.";
      }
    }

    if (!normalizedEmail && !normalizedPhone) {
      newErrors.email = "Vui lòng nhập Email hoặc Số điện thoại.";
      newErrors.phone = "Vui lòng nhập Email hoặc Số điện thoại.";
    }

    if (mode === "CREATE") {
      if (!password) {
        newErrors.password = "Vui lòng nhập mật khẩu khởi tạo.";
      } else if (password.length < 6) {
        newErrors.password = "Mật khẩu phải chứa ít nhất 6 ký tự.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    const payload: any = {
      fullName: fullName.trim(),
      email: normalizedEmail || null,
      phone: normalizedPhone || null,
      roleName: "CUSTOMER",
    };

    if (mode === "CREATE") {
      payload.password = password;
    }

    onSubmit(payload);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>
            {mode === "CREATE"
              ? "Thêm khách hàng mới"
              : "Cập nhật thông tin khách hàng"}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formContent} noValidate>
          {/* Ô nhập Họ Tên */}
          <div className={styles.formGroup}>
            <label htmlFor="fullName">
              Họ tên khách hàng <span className={styles.required}>*</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName)
                  setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              placeholder="Nhập đầy đủ họ tên khách hàng..."
              className={errors.fullName ? styles.inputError : ""}
              required
            />
            {errors.fullName && (
              <span className={styles.errorText}>⚠️ {errors.fullName}</span>
            )}
          </div>

          {/* Hàng đôi chứa Email và Số điện thoại */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Địa chỉ Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value.toLowerCase());
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="example@gmail.com"
                className={errors.email ? styles.inputError : ""}
              />
              {errors.email && (
                <span className={styles.errorText}>⚠️ {errors.email}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone">Số điện thoại</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone)
                    setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder="09xxxxxxxx"
                className={errors.phone ? styles.inputError : ""}
              />
              {errors.phone && (
                <span className={styles.errorText}>⚠️ {errors.phone}</span>
              )}
            </div>
          </div>

          <div className={styles.infoBox}>
            Tài khoản được tạo tại biểu mẫu này sẽ tự động phân quyền là{" "}
            <strong>Khách hàng thành viên (CUSTOMER)</strong>.
          </div>

          {/* Ô nhập mật khẩu khi thêm mới */}
          {mode === "CREATE" && (
            <div className={styles.formGroup}>
              <label htmlFor="password">
                Mật khẩu khởi tạo <span className={styles.required}>*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="Tối thiểu 6 ký tự để bảo mật..."
                className={errors.password ? styles.inputError : ""}
                required
              />
              {errors.password && (
                <span className={styles.errorText}>⚠️ {errors.password}</span>
              )}
            </div>
          )}

          {/* Thanh nút điều khiển */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner}></span>
              ) : mode === "CREATE" ? (
                "Tạo tài khoản"
              ) : (
                "Cập nhật ngay"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
