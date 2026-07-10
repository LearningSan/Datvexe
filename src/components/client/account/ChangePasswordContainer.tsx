"use client";

import { useState } from "react";
import { useChangePassword } from "@/hooks/client/useAccount";
import styles from "./ChangePasswordContainer.module.css";

export default function ChangePasswordContainer() {
  const mutation = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async () => {
    try {
      await mutation.mutateAsync({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Đổi mật khẩu</h1>

      <div className={styles.card}>
        {/* Input nhóm 1 */}
        <div className={styles.inputGroup}>
          <label htmlFor="current-password">Mật khẩu hiện tại</label>
          <input
            id="current-password"
            type="password"
            placeholder="Nhập mật khẩu đang sử dụng"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        {/* Input nhóm 2 */}
        <div className={styles.inputGroup}>
          <label htmlFor="new-password">Mật khẩu mới</label>
          <input
            id="new-password"
            type="password"
            placeholder="Tối thiểu 8 ký tự bảo mật"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        {/* Nút submit */}
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={mutation.isPending || !currentPassword || !newPassword}
        >
          {mutation.isPending ? "Đang cập nhật..." : "Xác nhận đổi mật khẩu"}
        </button>
      </div>
    </div>
  );
}
