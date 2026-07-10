"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { logout } from "@/services/client/auth.service";
import styles from "./layout.module.css";

export default function UserDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    clearAuth();
    router.push("/home");
  };

  return (
    <div className={styles.userDropdown}>
      <button
        className={styles.userButton}
        onClick={() => setOpen((prev) => !prev)}
      >
        {user.fullName || "Tài khoản"} ▾
      </button>

      {open && (
        <div className={styles.dropdownMenu}>
          <button onClick={() => router.push("/account/profile")}>
            Quản lý tài khoản
          </button>

          <button onClick={() => router.push("/account/tickets")}>
            Lịch sử mua vé
          </button>

          <button onClick={() => router.push("/account/change-password")}>
            Thay đổi mật khẩu
          </button>

          <button className={styles.logoutItem} onClick={handleLogout}>
            Thoát
          </button>
        </div>
      )}
    </div>
  );
}
