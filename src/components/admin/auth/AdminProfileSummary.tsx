"use client";

import { UserRound } from "lucide-react";

import { useAdminAuth } from "@/hooks/admin/useAuth";

import styles from "./AdminProfileSummary.module.css";

interface AdminProfileSummaryProps {
  collapsed?: boolean;
}

export default function AdminProfileSummary({
  collapsed = false,
}: AdminProfileSummaryProps) {
  const { user } = useAdminAuth();

  if (!user) {
    return null;
  }

  return (
    <div
      className={styles.profile}
      title={collapsed ? `${user.fullName} - ${user.roleName}` : undefined}
    >
      <div className={styles.avatar}>
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.fullName} />
        ) : (
          <UserRound size={20} />
        )}
      </div>

      {!collapsed && (
        <div className={styles.information}>
          <strong>{user.fullName}</strong>
          <span>{user.roleName}</span>
        </div>
      )}
    </div>
  );
}
