"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bus, X } from "lucide-react"; // Thêm icon X để đóng

import { ADMIN_MENU } from "./admin-menu";
import styles from "./AdminLayout.module.css";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
      <div className={styles.logoSection}>
        <div className={styles.logoBrand}>
          <Bus className={styles.logoIcon} size={26} />
          <h2>XE KHACH PT</h2>
        </div>

        {/* Nút đóng Sidebar trên mobile */}
        <button
          className={styles.closeMenuBtn}
          onClick={onClose}
          aria-label="Close Menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className={styles.navMenu}>
        {ADMIN_MENU.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose} // Tự động đóng menu sau khi bấm chuyển trang trên mobile
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
