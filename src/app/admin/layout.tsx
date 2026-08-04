"use client";

import AdminAuthBootstrap from "@/providers/AdminAuthBootstrap";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import { useAdminAuth } from "@/hooks/admin/useAuth";
import styles from "@/components/admin/layout/AdminLayout.module.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthBootstrap>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthBootstrap>
  );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const { initialized, isAuthenticated, logout } = useAdminAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!initialized) return;

    if (isLoginPage && isAuthenticated) {
      router.replace("/admin/dashboard");
      return;
    }

    if (!isLoginPage && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [initialized, isAuthenticated, isLoginPage, router]);

  if (!initialized) {
    return (
      <div className={styles.authLoading}>Đang kiểm tra phiên quản trị...</div>
    );
  }

  if (isLoginPage) {
    if (isAuthenticated) return null;
    return children;
  }

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    await logout();
    router.replace("/admin/login");
  };

  return (
    <div className={styles.layout}>
      {/* Nút Hamburger Menu Mobile (Góc trái) */}
      <button
        type="button"
        className={styles.mobileMenuBtn}
        onClick={() => setIsSidebarOpen((current) => !current)}
        aria-label="Mở menu quản trị"
        aria-expanded={isSidebarOpen}
      >
        <Menu size={24} />
      </button>

      {/* Nút Đăng xuất (Góc phải) - Đưa ra ngoài <main> để không bị trôi/ẩn trên Mobile */}
      <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
        <LogOut size={18} />
        <span className={styles.logoutText}>Đăng xuất</span>
      </button>

      {isSidebarOpen && (
        <button
          type="button"
          className={styles.overlay}
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Đóng menu quản trị"
        />
      )}

      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className={styles.main}>{children}</main>
    </div>
  );
}
