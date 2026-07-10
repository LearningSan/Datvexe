"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import { logout } from "@/services/client/auth.service";
import { useAuthStore } from "@/store/auth.store";

import AccountContainer from "./AccountContainer";
import TicketHistoryContainer from "./TicketHistoryContainer";
import ChangePasswordContainer from "./ChangePasswordContainer";

import styles from "./AccountDashboard.module.css";

export type TabType = "profile" | "tickets" | "password";

interface Props {
  initialTab?: TabType;
}

export default function AccountDashboard({ initialTab = "profile" }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleChangeTab = (tab: TabType) => {
    setActiveTab(tab);

    if (tab === "profile") router.push("/account/profile");
    if (tab === "tickets") router.push("/account/tickets");
    if (tab === "password") router.push("/account/change-password");
  };

  const renderRightContent = () => {
    switch (activeTab) {
      case "profile":
        return <AccountContainer />;
      case "tickets":
        return <TicketHistoryContainer />;
      case "password":
        return <ChangePasswordContainer />;
      default:
        return <AccountContainer />;
    }
  };

  const confirmLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
      router.push("/home");
      router.refresh();
    }
  };

  const handleLogout = () => {
    toast.custom(
      (t) => (
        <div
          className={`${styles.confirmPopup} ${
            t.visible ? styles.popupEnter : styles.popupLeave
          }`}
        >
          <div className={styles.popupHeader}>
            <span className={styles.popupIcon}>🚪</span>
            <h3>Xác nhận đăng xuất</h3>
          </div>

          <p className={styles.popupBody}>
            Bạn có chắc chắn muốn thoát khỏi tài khoản của hệ thống{" "}
            <strong>XeKhachPT</strong> không?
          </p>

          <div className={styles.popupActions}>
            <button
              className={styles.popupCancelBtn}
              onClick={() => toast.dismiss(t.id)}
            >
              Hủy bỏ
            </button>

            <button
              className={styles.popupConfirmBtn}
              onClick={async () => {
                toast.dismiss(t.id);
                await confirmLogout();
              }}
            >
              Đồng ý
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
        position: "top-center",
      },
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      <Toaster />

      <aside className={styles.sidebar}>
        <div className={styles.menuList}>
          <button
            className={`${styles.menuItem} ${
              activeTab === "profile" ? styles.activeMenuItem : ""
            }`}
            onClick={() => handleChangeTab("profile")}
          >
            👤 Quản lý tài khoản
          </button>

          <button
            className={`${styles.menuItem} ${
              activeTab === "tickets" ? styles.activeMenuItem : ""
            }`}
            onClick={() => handleChangeTab("tickets")}
          >
            🎫 Lịch sử vé
          </button>

          <button
            className={`${styles.menuItem} ${
              activeTab === "password" ? styles.activeMenuItem : ""
            }`}
            onClick={() => handleChangeTab("password")}
          >
            🔒 Đổi mật khẩu
          </button>
        </div>

        <button className={styles.btnLogout} onClick={handleLogout}>
          🚪 Thoát tài khoản
        </button>
      </aside>

      <main className={styles.contentArea}>
        <div className={styles.innerContent}>{renderRightContent()}</div>
      </main>
    </div>
  );
}
