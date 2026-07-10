"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bus } from "lucide-react";

import { ADMIN_MENU } from "./admin-menu";
import styles from "./AdminLayout.module.css";

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoSection}>
        <Bus className={styles.logoIcon} size={26} />
        <h2>XE KHACH PT</h2>
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