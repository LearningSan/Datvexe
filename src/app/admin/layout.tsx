import AdminSidebar from "@/components/admin/layout/AdminSidebar";
import styles from "@/components/admin/layout/AdminLayout.module.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <AdminSidebar />

      <main className={styles.main}>{children}</main>
    </div>
  );
}
