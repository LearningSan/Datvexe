"use client";

import { useRouter } from "next/navigation";

import { LoaderCircle, LogOut } from "lucide-react";

import { useAdminAuth } from "@/hooks/admin/useAuth";

import styles from "./AdminLogoutButton.module.css";

interface AdminLogoutButtonProps {
  collapsed?: boolean;
}

export default function AdminLogoutButton({
  collapsed = false,
}: AdminLogoutButtonProps) {
  const router = useRouter();

  const { logout, isLoggingOut } = useAdminAuth();

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    try {
      await logout();
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      className={styles.button}
      onClick={handleLogout}
      disabled={isLoggingOut}
      title={collapsed ? "Đăng xuất" : undefined}
    >
      {isLoggingOut ? (
        <LoaderCircle size={19} className={styles.spinner} />
      ) : (
        <LogOut size={19} />
      )}

      {!collapsed && (
        <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
      )}
    </button>
  );
}
