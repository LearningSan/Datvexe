"use client";

import { useEffect, useState } from "react";
import styles from "./DriverFormModal.module.css";
import type { AdminDriverItem } from "@/types/admin/drivers/driver-management.type";

interface Props {
  open: boolean;
  mode: "CREATE" | "EDIT";
  driver?: AdminDriverItem | null;
  onClose: () => void;
  onSubmit: (payload: any) => void;
  loading?: boolean;
}

export default function DriverFormModal({
  open,
  mode,
  driver,
  onClose,
  onSubmit,
  loading,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [driverType, setDriverType] = useState<"BUS" | "SHUTTLE" | "BOTH">(
    "BUS",
  );
  const [licenseNumber, setLicenseNumber] = useState("");
  const [hiredDate, setHiredDate] = useState("");

  const [errors, setErrors] = useState<{
    fullName?: string;
    phone?: string;
    email?: string;
    password?: string;
    licenseNumber?: string;
  }>({});

  useEffect(() => {
    if (!open) return;

    if (mode === "EDIT" && driver) {
      setFullName(driver.fullName);
      setEmail(driver.email ?? "");
      setPhone(driver.phone ?? "");
      setDriverType(driver.driverType);
      setLicenseNumber(driver.licenseNumber);
      setHiredDate(driver.hiredDate?.split("T")[0] ?? "");
      setPassword("");
    } else {
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setDriverType("BUS");
      setLicenseNumber("");
      setHiredDate("");
    }
    setErrors({});
  }, [mode, driver, open]);

  if (!open) return null;

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) newErrors.fullName = "Vui lòng nhập họ tên tài xế.";

    if (!phone.trim()) {
      newErrors.phone = "Số điện thoại bắt buộc để điều phối liên lạc.";
    } else if (!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(phone.trim())) {
      newErrors.phone = "Số điện thoại gồm 10 chữ số hợp lệ VN.";
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Định dạng Email không chính xác.";
    }

    if (!licenseNumber.trim()) {
      newErrors.licenseNumber = "Số giấy phép lái xe (GPLX) bắt buộc.";
    }

    if (mode === "CREATE") {
      if (!password) newErrors.password = "Vui lòng đặt mật khẩu tài khoản.";
      else if (password.length < 6)
        newErrors.password = "Mật khẩu tối thiểu 6 ký tự.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: any = {
      fullName: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      driverType,
      licenseNumber: licenseNumber.trim(),
      hiredDate: hiredDate || null,
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
              ? "Thêm hồ sơ tài xế"
              : "Cập nhật thông tin tài xế"}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formContent} noValidate>
          <div className={styles.formGroup}>
            <label>
              Họ tên tài xế <span className={styles.required}>*</span>
            </label>
            <input
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errors.fullName)
                  setErrors((p) => ({ ...p, fullName: undefined }));
              }}
              placeholder="Nhập đầy đủ họ tên..."
              className={errors.fullName ? styles.inputError : ""}
            />
            {errors.fullName && (
              <span className={styles.errorText}>⚠️ {errors.fullName}</span>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                Số điện thoại <span className={styles.required}>*</span>
              </label>
              <input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone)
                    setErrors((p) => ({ ...p, phone: undefined }));
                }}
                placeholder="09xxxxxxxx"
                className={errors.phone ? styles.inputError : ""}
              />
              {errors.phone && (
                <span className={styles.errorText}>⚠️ {errors.phone}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Địa chỉ Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email)
                    setErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder="driver@company.com"
                className={errors.email ? styles.inputError : ""}
              />
              {errors.email && (
                <span className={styles.errorText}>⚠️ {errors.email}</span>
              )}
            </div>
          </div>

          {mode === "CREATE" && (
            <div className={styles.formGroup}>
              <label>
                Mật khẩu khởi tạo <span className={styles.required}>*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password)
                    setErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder="Tối thiểu 6 ký tự..."
                className={errors.password ? styles.inputError : ""}
              />
              {errors.password && (
                <span className={styles.errorText}>⚠️ {errors.password}</span>
              )}
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Loại phân công lái xe</label>
            <select
              value={driverType}
              onChange={(e) => setDriverType(e.target.value as any)}
            >
              <option value="BUS">Tài xế xe khách (Tuyến cố định)</option>
              <option value="SHUTTLE">
                Tài xế xe trung chuyển (Nội thành)
              </option>
              <option value="BOTH">Cả hai loại hình</option>
            </select>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>
                Số bằng lái (GPLX) <span className={styles.required}>*</span>
              </label>
              <input
                value={licenseNumber}
                onChange={(e) => {
                  setLicenseNumber(e.target.value);
                  if (errors.licenseNumber)
                    setErrors((p) => ({ ...p, licenseNumber: undefined }));
                }}
                placeholder="Nhập số thẻ GPLX..."
                className={errors.licenseNumber ? styles.inputError : ""}
              />
              {errors.licenseNumber && (
                <span className={styles.errorText}>
                  ⚠️ {errors.licenseNumber}
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Ngày vào làm</label>
              <input
                type="date"
                value={hiredDate}
                onChange={(e) => setHiredDate(e.target.value)}
              />
            </div>
          </div>

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
              {loading ? <span className={styles.spinner}></span> : "Lưu hồ sơ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
