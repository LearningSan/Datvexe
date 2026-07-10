"use client";

import { useState } from "react";
import Image from "next/image"; // 1. Import thêm Image từ Next.js
import styles from "./layout.module.css";

import AuthModal from "@/components/client/auth/AuthModal/AuthModal";
import { useAuthStore } from "@/store/auth.store";
import UserDropdown from "./UserDropdown";
import NotificationDropdown from "./NotificationDropdown";

export default function Header() {
  const [openAuth, setOpenAuth] = useState(false);
  const user = useAuthStore((s) => s.user);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <nav className={styles.leftNav}>
            <a href="#" className={styles.navLink}>
              Lịch Trình
            </a>
            <a href="#" className={styles.navLink}>
              Tra Cứu Vé
            </a>
          </nav>

          {/* Thay thế khối brandBox cũ bằng logo mới */}
          <div className={styles.brandBox}>
            <a href="/" className={styles.logoWrapper}>
              <Image
                src="/logo.png"
                alt="XeKhachPT Logo"
                width={130}
                height={38}
                priority
                className={styles.logoImg}
              />
            </a>
          </div>

          <nav className={styles.rightNav}>
            <a href="#" className={styles.navLink}>
              Tin Tức
            </a>
            <a href="#" className={styles.navLink}>
              Liên Hệ
            </a>

            {user && <NotificationDropdown />}

            {user ? (
              <UserDropdown />
            ) : (
              <button
                className={styles.btnLogin}
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
