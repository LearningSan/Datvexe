"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import axios from "axios";

import {
  BusFront,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { useAdminAuth } from "@/hooks/admin/useAuth";

import styles from "./AdminLoginContainer.module.css";

interface AdminLoginForm {
  email: string;
  password: string;
}

interface AdminLoginErrors {
  email?: string;
  password?: string;
  general?: string;
}

const INITIAL_FORM: AdminLoginForm = {
  email: "",
  password: "",
};

export default function AdminLoginContainer() {
  const { login, isLoggingIn, resetLoginError } = useAdminAuth();

  const [form, setForm] = useState<AdminLoginForm>(INITIAL_FORM);

  const [errors, setErrors] = useState<AdminLoginErrors>({});

  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: undefined,
      general: undefined,
    }));

    resetLoginError();
  }

  function validateForm(): boolean {
    const nextErrors: AdminLoginErrors = {};

    const email = form.email.trim();

    if (!email) {
      nextErrors.email = "Vui lòng nhập địa chỉ email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Địa chỉ email không hợp lệ";
    }

    if (!form.password) {
      nextErrors.password = "Vui lòng nhập mật khẩu";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoggingIn || !validateForm()) {
      return;
    }

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrors({
          general:
            error.response?.data?.message ?? "Không thể đăng nhập quản trị",
        });

        return;
      }

      setErrors({
        general: "Đã xảy ra lỗi khi đăng nhập quản trị",
      });
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.decorLeft} />
      <div className={styles.decorRight} />

      <div className={styles.loginBox}>
        <section className={styles.introduction}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>
              <BusFront size={27} />
            </span>

            <span>XE KHÁCH PT</span>
          </div>

          <div className={styles.introductionContent}>
            <span className={styles.badge}>
              <ShieldCheck size={16} />
              Hệ thống quản trị
            </span>

            <h1>
              Quản lý vận hành
              <br />
              thuận tiện hơn
            </h1>

            <p>
              Theo dõi chuyến xe, vé, thanh toán, phương tiện và toàn bộ hoạt
              động vận hành trên cùng một hệ thống.
            </p>
          </div>

          <p className={styles.copyright}>© 2026 Xe Khách PT</p>
        </section>

        <section className={styles.loginSection}>
          <div className={styles.mobileBrand}>
            <BusFront size={24} />
            <span>XE KHÁCH PT</span>
          </div>

          <header className={styles.header}>
            <span className={styles.headerLabel}>ADMIN PORTAL</span>

            <h2>Đăng nhập quản trị</h2>

            <p>Sử dụng tài khoản quản trị để truy cập hệ thống</p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {errors.general && (
              <div className={styles.generalError} role="alert">
                {errors.general}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="admin-email">Địa chỉ email</label>

              <div
                className={[
                  styles.inputBox,
                  errors.email ? styles.inputBoxError : "",
                ].join(" ")}
              >
                <Mail size={19} className={styles.inputIcon} />

                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  disabled={isLoggingIn}
                />
              </div>

              {errors.email && (
                <p className={styles.fieldError}>{errors.email}</p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="admin-password">Mật khẩu</label>

              <div
                className={[
                  styles.inputBox,
                  errors.password ? styles.inputBoxError : "",
                ].join(" ")}
              >
                <LockKeyhole size={19} className={styles.inputIcon} />

                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  disabled={isLoggingIn}
                />

                <button
                  type="button"
                  className={styles.passwordButton}
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isLoggingIn}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              {errors.password && (
                <p className={styles.fieldError}>{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <LoaderCircle size={19} className={styles.spinner} />
                  Đang đăng nhập...
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>

          <p className={styles.securityText}>
            Phiên đăng nhập quản trị được bảo vệ bằng access token và refresh
            token riêng.
          </p>
        </section>
      </div>
    </div>
  );
}
