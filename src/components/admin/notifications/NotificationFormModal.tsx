"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, Loader2, Send, X } from "lucide-react";
import NotificationRecipientSelect from "./NotificationRecipientSelect";
import {
  useCreateNotification,
  useUpdateNotification,
} from "@/hooks/admin/useNotificationManagement";

import type {
  AdminNotificationItem,
  AdminNotificationType,
} from "@/types/admin/notifications/notification-management.type";

import styles from "./NotificationFormModal.module.css";

interface Props {
  mode: "create" | "edit";
  notification: AdminNotificationItem | null;
  onClose: () => void;
}

export default function NotificationFormModal({
  mode,
  notification,
  onClose,
}: Props) {
  const createMutation = useCreateNotification();
  const updateMutation = useUpdateNotification();

  const [userId, setUserId] = useState(
    notification?.userId ? String(notification.userId) : "",
  );
  const [title, setTitle] = useState(notification?.title || "");
  const [content, setContent] = useState(notification?.content || "");
  const [notificationType, setNotificationType] =
    useState<AdminNotificationType>(
      notification?.notificationType || "BOOKING",
    );

  const [errors, setErrors] = useState<{
    userId?: string;
    title?: string;
    content?: string;
  }>({});

  useEffect(() => {
    if (notification) {
      setUserId(String(notification.userId));
      setTitle(notification.title);
      setContent(notification.content);
      setNotificationType(notification.notificationType);
    }
  }, [notification]);

  // Đóng modal bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const validate = () => {
    const nextErrors: typeof errors = {};

    if (mode === "create") {
      if (!userId.trim()) {
        nextErrors.userId = "Vui lòng nhập mã người nhận";
      } else if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
        nextErrors.userId = "Mã người nhận phải là số nguyên dương";
      }
    }

    if (!title.trim()) {
      nextErrors.title = "Tiêu đề không được để trống";
    } else if (title.trim().length > 255) {
      nextErrors.title = "Tiêu đề tối đa 255 ký tự";
    }

    if (!content.trim()) {
      nextErrors.content = "Nội dung không được để trống";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      if (mode === "create") {
        await createMutation.mutateAsync({
          userId: Number(userId),
          title: title.trim(),
          content: content.trim(),
          notificationType,
        });

        toast.success("Tạo thông báo thành công");
      } else {
        if (!notification) return;

        await updateMutation.mutateAsync({
          notificationId: notification.notificationId,
          payload: {
            title: title.trim(),
            content: content.trim(),
            notificationType,
          },
        });

        toast.success("Cập nhật thông báo thành công");
      }

      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : mode === "create"
            ? "Không thể tạo thông báo"
            : "Không thể cập nhật thông báo",
      );
    }
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-modal-title"
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 id="form-modal-title" className={styles.title}>
              {mode === "create" ? "Tạo thông báo" : "Chỉnh sửa thông báo"}
            </h2>
            <p className={styles.subtitle}>
              {mode === "create"
                ? "Tạo và gửi thông báo mới cho khách hàng."
                : "Cập nhật nội dung thông báo hiện tại."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={styles.closeBtn}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.body}>
            {mode === "create" && (
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Người nhận <span className={styles.required}>*</span>
                </label>

                <NotificationRecipientSelect
                  value={userId ? Number(userId) : null}
                  onChange={(user) => {
                    setUserId(user?.userId != null ? String(user.userId) : "");

                    if (errors.userId) {
                      setErrors((prev) => ({
                        ...prev,
                        userId: undefined,
                      }));
                    }
                  }}
                  error={errors.userId}
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="notificationType" className={styles.label}>
                Loại thông báo
              </label>
              <div className={styles.selectWrapper}>
                <select
                  id="notificationType"
                  value={notificationType}
                  onChange={(e) =>
                    setNotificationType(e.target.value as AdminNotificationType)
                  }
                  className={styles.select}
                >
                  <option value="BOOKING">Đặt vé (Booking)</option>
                  <option value="PAYMENT">Thanh toán (Payment)</option>
                  <option value="TRIP">Chuyến xe (Trip)</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.labelHeader}>
                <label htmlFor="title" className={styles.label}>
                  Tiêu đề <span className={styles.required}>*</span>
                </label>
                <span
                  className={`${styles.counter} ${
                    title.length >= 250 ? styles.counterWarning : ""
                  }`}
                >
                  {title.length}/255
                </span>
              </div>
              <input
                id="title"
                type="text"
                value={title}
                maxLength={255}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title)
                    setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                placeholder="Nhập tiêu đề thông báo..."
                className={`${styles.input} ${errors.title ? styles.inputError : ""}`}
              />
              {errors.title && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={13} /> {errors.title}
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="content" className={styles.label}>
                Nội dung chi tiết <span className={styles.required}>*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (errors.content)
                    setErrors((prev) => ({ ...prev, content: undefined }));
                }}
                rows={5}
                placeholder="Nhập nội dung thông báo đầy đủ..."
                className={`${styles.textarea} ${errors.content ? styles.inputError : ""}`}
              />
              {errors.content && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={13} /> {errors.content}
                </span>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={styles.cancelButton}
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>
                    {mode === "create" ? "Tạo thông báo" : "Lưu thay đổi"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
