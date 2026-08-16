"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

import {
  useNotifications,
  useDeleteNotification,
  useUpdateNotificationReadStatus,
} from "@/hooks/admin/useNotificationManagement";

import type {
  AdminNotificationItem,
  AdminNotificationListParams,
} from "@/types/admin/notifications/notification-management.type";

import NotificationToolbar from "./NotificationToolbar";
import NotificationTable from "./NotificationTable";
import NotificationFormModal from "./NotificationFormModal";
import NotificationDetailModal from "./NotificationDetailModal";
import NotificationDeleteModal from "./NotificationDeleteModal";
import NotificationStatistics from "./NotificationStatistics";
import styles from "./NotificationManagementContainer.module.css";

export default function NotificationManagementContainer() {
  const [params, setParams] = useState<AdminNotificationListParams>({
    keyword: "",
    page: 1,
    limit: 10,
  });

  const [selectedNotification, setSelectedNotification] =
    useState<AdminNotificationItem | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);

  const [detailNotification, setDetailNotification] =
    useState<AdminNotificationItem | null>(null);

  const [deleteNotification, setDeleteNotification] =
    useState<AdminNotificationItem | null>(null);

  const notificationsQuery = useNotifications(params);
  const deleteMutation = useDeleteNotification();
  const readStatusMutation = useUpdateNotificationReadStatus();

  const data = notificationsQuery.data;

  const handleSearch = (keyword: string) => {
    setParams((prev) => ({
      ...prev,
      keyword,
      page: 1,
    }));
  };

  const handleTypeChange = (
    notificationType: "BOOKING" | "PAYMENT" | "TRIP" | undefined,
  ) => {
    setParams((prev) => ({
      ...prev,
      notificationType,
      page: 1,
    }));
  };

  const handleReadChange = (isRead: boolean | undefined) => {
    setParams((prev) => ({
      ...prev,
      isRead,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setParams((prev) => ({
      ...prev,
      page,
    }));
  };

  const handleCreate = () => {
    setSelectedNotification(null);
    setFormMode("create");
  };

  const handleEdit = (notification: AdminNotificationItem) => {
    setSelectedNotification(notification);
    setFormMode("edit");
  };

  const handleView = (notification: AdminNotificationItem) => {
    setDetailNotification(notification);
  };

  const handleDelete = (notification: AdminNotificationItem) => {
    setDeleteNotification(notification);
  };

  const handleToggleRead = async (notification: AdminNotificationItem) => {
    try {
      await readStatusMutation.mutateAsync({
        notificationId: notification.notificationId,
        isRead: !notification.isRead,
      });

      toast.success(
        notification.isRead ? "Đã đánh dấu chưa đọc" : "Đã đánh dấu đã đọc",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái",
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteNotification) return;

    try {
      await deleteMutation.mutateAsync(deleteNotification.notificationId);
      toast.success("Xóa thông báo thành công");
      setDeleteNotification(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa thông báo",
      );
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Quản lý thông báo</h1>
          <p className={styles.description}>
            Quản lý các thông báo được gửi đến khách hàng hệ thống.
          </p>
        </div>

        <button
          type="button"
          className={styles.createButton}
          onClick={handleCreate}
        >
          <Plus size={16} />
          <span>Tạo thông báo</span>
        </button>
      </div>
      <NotificationStatistics
        statistics={
          data?.statistics ?? {
            total: 0,
            unread: 0,
            read: 0,
            today: 0,
          }
        }
      />
      <NotificationToolbar
        keyword={params.keyword || ""}
        notificationType={params.notificationType}
        isRead={params.isRead}
        onSearch={handleSearch}
        onTypeChange={handleTypeChange}
        onReadChange={handleReadChange}
      />

      <NotificationTable
        items={data?.items || []}
        loading={notificationsQuery.isLoading}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleRead={handleToggleRead}
      />

      {data && data.total > 0 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Hiển thị <strong>{data.items.length}</strong> /{" "}
            <strong>{data.total}</strong> thông báo
          </span>

          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={(data.page || 1) <= 1}
              onClick={() => handlePageChange(data.page - 1)}
            >
              <ChevronLeft size={16} />
            </button>

            <span className={styles.pageText}>
              Trang {data.page} / {totalPages}
            </span>

            <button
              type="button"
              className={styles.pageBtn}
              disabled={data.page >= totalPages}
              onClick={() => handlePageChange(data.page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {formMode && (
        <NotificationFormModal
          mode={formMode}
          notification={selectedNotification}
          onClose={() => {
            setFormMode(null);
            setSelectedNotification(null);
          }}
        />
      )}

      {detailNotification && (
        <NotificationDetailModal
          notification={detailNotification}
          onClose={() => setDetailNotification(null)}
        />
      )}

      {deleteNotification && (
        <NotificationDeleteModal
          notification={deleteNotification}
          loading={deleteMutation.isPending}
          onCancel={() => setDeleteNotification(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
