"use client";

import { useEffect, useState } from "react";
import {
  useAccountProfile,
  useUpdateAccountProfile,
  useUploadAccountAvatar,
} from "@/hooks/client/useAccount";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

import styles from "./AccountContainer.module.css";

export default function AccountContainer() {
  const { data: profile, isLoading, refetch } = useAccountProfile();
  const updateProfileMutation = useUpdateAccountProfile();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [message, setMessage] = useState("");
  const uploadAvatarMutation = useUploadAccountAvatar();
  const [avatarPublicId, setAvatarPublicId] = useState<string | null>(null);
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessage("");

    try {
      const uploaded = await uploadAvatarMutation.mutateAsync(file);

      setAvatarUrl(uploaded.avatarUrl);
      setAvatarPublicId(uploaded.avatarPublicId);
      setMessage("Upload ảnh thành công, bấm Lưu thay đổi để cập nhật");
    } catch {
      setMessage("Upload ảnh thất bại");
    }
  };
  useEffect(() => {
    if (!profile) return;
    setAvatarPublicId(profile.avatarPublicId || null);
    setFullName(profile.fullName || "");
    setPhone(profile.phone || "");
    setAvatarUrl(profile.avatarUrl || "");
  }, [profile]);

  const handleSubmit = async () => {
    setMessage("");

    try {
      await updateProfileMutation.mutateAsync({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        avatarPublicId,
      });

      await refetch();
      setMessage("Cập nhật tài khoản thành công");
    } catch {
      setMessage("Cập nhật tài khoản thất bại");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Quản lý tài khoản</h1>

      <BlockErrorBoundary fallback={<BlockSkeleton height={320} />}>
        {isLoading ? (
          <BlockSkeleton height={320} />
        ) : (
          <div className={styles.card}>
            <div className={styles.avatarBox}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {fullName.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div className={styles.avatarAction}>
              <label className={styles.uploadBtn}>
                {uploadAvatarMutation.isPending
                  ? "Đang upload..."
                  : "Đổi ảnh đại diện"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  hidden
                  disabled={uploadAvatarMutation.isPending}
                />
              </label>
            </div>
            <div className={styles.inputGroup}>
              <label>Họ tên</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ tên"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Email</label>
              <input value={profile?.email || "Chưa cập nhật"} disabled />
            </div>

            <div className={styles.inputGroup}>
              <label>Số điện thoại</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
              />
            </div>

            <button
              className={styles.saveBtn}
              onClick={handleSubmit}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </button>

            {message && (
              <p
                className={`${styles.message} ${
                  message.includes("thành công")
                    ? styles.successMessage
                    : styles.errorMessage
                }`}
              >
                {message}
              </p>
            )}
          </div>
        )}
      </BlockErrorBoundary>
    </div>
  );
}
