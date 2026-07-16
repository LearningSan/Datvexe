"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react"; // Import thêm icon đóng/mở
import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import styles from "@/components/admin/layout/AdminLayout.module.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className={styles.layout}>
      {/* Nút bấm mở Menu chỉ hiện trên điện thoại */}
      <button
        className={styles.mobileMenuBtn}
        onClick={toggleSidebar}
        aria-label="Toggle Menu"
      >
        <Menu size={24} />
      </button>

      {/* Lớp phủ mờ phía sau khi mở Sidebar trên mobile */}
      {isSidebarOpen && (
        <div className={styles.overlay} onClick={closeSidebar} />
      )}

      {/* Truyền state và hàm đóng vào Sidebar */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <main className={styles.main}>{children}</main>
    </div>
  );
}
