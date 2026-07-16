"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// Đổi từ layout.module.css sang file css riêng vừa tạo
import styles from "./Header.module.css";

import AuthModal from "@/components/client/auth/AuthModal/AuthModal";
import NotificationDropdown from "./NotificationDropdown";
import UserDropdown from "./UserDropdown";

import { useAuthStore } from "@/store/auth.store";

export default function Header() {
  const [openAuth, setOpenAuth] = useState(false);
  const user = useAuthStore((state) => state.user);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* Menu bên trái */}
          <nav className={styles.leftNav}>
            <Link href="/schedule" className={styles.navLink}>
              Lịch Trình
            </Link>

            <Link href="/account/tickets" className={styles.navLink}>
              Tra Cứu Vé
            </Link>
            <Link href="/news" className={styles.navLink}>
              Tin Tức
            </Link>
            <Link href="/contact" className={styles.navLink}>
              Liên Hệ
            </Link>
          </nav>

          {/* Logo ở trung tâm */}
          <div className={styles.brandBox}>
            <Link href="/" className={styles.logoWrapper}>
              <Image
                src="/logo.png"
                alt="XeKhachPT Logo"
                width={130}
                height={38}
                priority
                className={styles.logoImg}
              />
            </Link>
          </div>

          {/* Menu bên phải */}
          <nav className={styles.rightNav}>
            {/* Chỉ hiển thị Ví của tôi khi đã đăng nhập */}
            {user && (
              <Link href="/account/wallet" className={styles.walletLink}>
                <span className={styles.walletIcon}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.svgIcon}
                  >
                    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-1" />
                    <path d="M19 11v4" />
                  </svg>
                </span>
                <span className={styles.walletText}>Ví của tôi</span>
              </Link>
            )}

            {user && <NotificationDropdown />}

            {user ? (
              <UserDropdown />
            ) : (
              <button
                type="button"
                className={styles.headerLoginButton}
                onClick={() => setOpenAuth(true)}
              >
                Đăng Nhập
              </button>
            )}
          </nav>
        </div>
      </header>

      {openAuth && <AuthModal onClose={() => setOpenAuth(false)} />}
    </>
  );
}
