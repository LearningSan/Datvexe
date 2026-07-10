"use client";

import { useState, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
  useUsers,
} from "@/hooks/admin/useUsers";

import UserFormModal from "./UserFormModal";
import UserDetailModal from "./UserDetailModal";
import type { AdminUserItem } from "@/types/admin/users/user-management.type";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

import styles from "./UsersContainer.module.css";
import { formatDateTimeVN } from "@/lib/client/helpers";

export default function UsersContainer() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"" | "ACTIVE" | "BLOCKED">("");
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailUser, setDetailUser] = useState<AdminUserItem | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const statusMutation = useUpdateUserStatus();

  // Tải danh sách dữ liệu người dùng
  const { data, isLoading, isError } = useUsers({
    keyword: searchKeyword,
    status: status || undefined,
    page,
    limit: 10,
  });

  const handleSearch = () => {
    setPage(1);
    setSearchKeyword(keyword.trim());
  };

  const handleClearSearch = () => {
    setKeyword("");
    setSearchKeyword("");
    setPage(1);
    toast.success("Đã xóa bộ lọc tìm kiếm");
    inputRef.current?.focus();
  };

  // Hàm kích hoạt Popup xác nhận thay đổi trạng thái (Khóa/Mở khóa) độc quyền bằng Custom Toast
  const confirmToggleStatus = (user: AdminUserItem) => {
    const isLocking = user.status === "ACTIVE";
    const targetStatus = isLocking ? "BLOCKED" : "ACTIVE";
    const actionText = isLocking ? "Khóa tài khoản" : "Mở khóa tài khoản";
    const actionLabel = isLocking ? "khóa" : "mở khóa";

    toast.custom(
      (t) => (
        <div
          className={`${styles.confirmPopup} ${
            t.visible ? styles.popupEnter : styles.popupLeave
          }`}
        >
          <div className={styles.popupHeader}>
            <span className={styles.popupIcon}>{isLocking ? "🔒" : "🔓"}</span>
            <h3 style={{ color: isLocking ? "#c2410c" : "#047857" }}>
              {actionText}
            </h3>
          </div>
          <p className={styles.popupBody}>
            Bạn có chắc chắn muốn {actionLabel} tài khoản của khách hàng{" "}
            <strong>{user.fullName}</strong> không? Hành động này sẽ ảnh hưởng
            đến quyền truy cập của họ.
          </p>
          <div className={styles.popupActions}>
            <button
              className={styles.popupCancelBtn}
              onClick={() => toast.dismiss(t.id)}
            >
              Hủy bỏ
            </button>
            <button
              className={styles.popupConfirmBtn}
              style={{ backgroundColor: isLocking ? "#ea580c" : "#059669" }}
              onClick={() => {
                toast.dismiss(t.id);
                executeStatusChange(user.userId!, targetStatus, user.fullName);
              }}
            >
              Xác nhận
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }, // Giữ popup cho đến khi đưa ra quyết định
    );
  };

  // Hàm xử lý gọi API cập nhật trạng thái
  const executeStatusChange = (
    userId: number,
    targetStatus: "ACTIVE" | "BLOCKED",
    fullName: string,
  ) => {
    const actionName = targetStatus === "BLOCKED" ? "khóa" : "mở khóa";

    statusMutation.mutate(
      { userId, status: targetStatus },
      {
        onSuccess: () => {
          toast.success(`Đã ${actionName} tài khoản "${fullName}" thành công!`);
        },
        onError: (err: any) => {
          toast.error(err?.message || `Thay đổi trạng thái thất bại.`);
        },
      },
    );
  };

  if (isLoading) return <BlockSkeleton height={500} />;

  if (isError) {
    return (
      <div className={styles.errorWrapper}>
        <p>Không thể tải danh sách khách hàng. Vui lòng thử lại sau.</p>
      </div>
    );
  }

  const userItems = data?.items ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 10) || 1;
  const totalCustomers = data?.total ?? 0;

  const registeredCount = userItems.filter(
    (user) => user.customerType === "REGISTERED",
  ).length;

  const guestCount = userItems.filter(
    (user) => user.customerType === "GUEST",
  ).length;

  const activeCount = userItems.filter(
    (user) => user.status === "ACTIVE",
  ).length;

  const blockedCount = userItems.filter(
    (user) => user.status === "BLOCKED",
  ).length;
  return (
    <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: "system-ui, sans-serif",
            fontSize: "14.5px",
            fontWeight: 500,
            borderRadius: "8px",
            padding: "12px 18px",
          },
        }}
      />

      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div>
            <h1>Quản lý khách hàng</h1>
            <p>
              Quản lý tài khoản khách hàng thành viên và khách vãng lai trong hệ
              thống.
            </p>
          </div>

          <button
            className={styles.primaryBtn}
            onClick={() => {
              setFormMode("CREATE");
              setSelectedUser(null);
              setOpenForm(true);
            }}
          >
            <span className={styles.icon}>+</span> Thêm khách hàng
          </button>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span>Tổng khách hàng</span>
            <strong>{totalCustomers}</strong>
          </div>

          <div className={styles.statCard}>
            <span>Thành viên</span>
            <strong>{registeredCount}</strong>
          </div>

          <div className={styles.statCard}>
            <span>Khách vãng lai</span>
            <strong>{guestCount}</strong>
          </div>

          <div className={styles.statCard}>
            <span>Đang hoạt động</span>
            <strong>{activeCount}</strong>
          </div>

          <div className={styles.statCard}>
            <span>Đã khóa</span>
            <strong>{blockedCount}</strong>
          </div>
        </div>
        {/* Filters Section */}
        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Tìm theo tên, email, số điện thoại..."
              className={styles.searchInput}
            />

            {keyword && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClearSearch}
                aria-label="Xóa từ khóa"
              >
                &times;
              </button>
            )}

            <button
              type="button"
              className={styles.searchBtn}
              onClick={handleSearch}
            >
              Tìm kiếm
            </button>
          </div>

          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as "" | "ACTIVE" | "BLOCKED");
            }}
            className={styles.selectInput}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="BLOCKED">Đã khóa</option>
          </select>
        </div>

        {/* Data Table */}
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Liên hệ</th>
                <th>Loại khách</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {userItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    <div className={styles.emptyState}>
                      <p>
                        Không tìm thấy khách hàng phù hợp với bộ lọc hiện tại.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                userItems.map((user, index) => {
                  const isGuest = user.customerType === "GUEST" || !user.userId;
                  const key = user.userId
                    ? `registered-${user.userId}`
                    : `guest-${user.email ?? "email"}-${user.phone ?? "phone"}-${index}`;

                  return (
                    <tr key={key}>
                      <td>
                        <div className={styles.userInfo}>
                          <div className={styles.avatarPlaceholder}>
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.fullName}
                                className={styles.avatarImage}
                              />
                            ) : (
                              user.fullName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className={styles.userName}>
                              {user.fullName}
                            </div>
                            <span className={styles.userId}>
                              {isGuest
                                ? "Khách vãng lai"
                                : `ID: #${user.userId}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className={styles.userContact}>
                          <span className={user.email ? "" : styles.textMuted}>
                            {user.email ?? "Chưa có email"}
                          </span>
                          <small>{user.phone ?? "Không có SĐT"}</small>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`${styles.roleBadge} ${
                            isGuest ? styles.badgeGuest : styles.badgeRegistered
                          }`}
                        >
                          {isGuest ? "GUEST" : user.roleName || "MEMBER"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            user.status === "ACTIVE"
                              ? styles.active
                              : styles.blocked
                          }`}
                        >
                          {user.status === "ACTIVE" ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </td>

                      <td>
                        <div className={styles.actionGroup}>
                          {isGuest ? (
                            <span className={styles.guestNote}>
                              Khách vãng lai
                            </span>
                          ) : (
                            <>
                              <button
                                className={styles.editBtn}
                                onClick={() => {
                                  setFormMode("EDIT");
                                  setSelectedUser(user);
                                  setOpenForm(true);
                                }}
                              >
                                Sửa
                              </button>

                              <button
                                className={
                                  user.status === "ACTIVE"
                                    ? styles.lockBtn
                                    : styles.unlockBtn
                                }
                                disabled={statusMutation.isPending}
                                onClick={() => confirmToggleStatus(user)}
                              >
                                {user.status === "ACTIVE" ? "Khóa" : "Mở"}
                              </button>

                              <button
                                className={styles.detailBtn}
                                onClick={() => {
                                  setDetailUser(user);
                                  setOpenDetail(true);
                                }}
                              >
                                Chi tiết
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        <div className={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={styles.pageBtn}
          >
            ← Trước
          </button>

          <span className={styles.pageIndicator}>
            Trang <strong>{data?.page ?? page}</strong> / {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className={styles.pageBtn}
          >
            Sau →
          </button>
        </div>

        {/* Modals */}
        <UserFormModal
          open={openForm}
          mode={formMode}
          user={selectedUser}
          loading={createMutation.isPending || updateMutation.isPending}
          onClose={() => setOpenForm(false)}
          onSubmit={(payload) => {
            if (formMode === "CREATE") {
              createMutation.mutate(payload, {
                onSuccess: () => {
                  setOpenForm(false);
                  toast.success("Tạo tài khoản khách hàng mới thành công! 🎉");
                },
                onError: (error: any) => {
                  toast.error(
                    error?.message ||
                      "Không thể tạo tài khoản. Hãy kiểm tra lại dữ liệu.",
                  );
                },
              });
            } else {
              if (!selectedUser?.userId) return;
              updateMutation.mutate(
                { userId: selectedUser.userId, payload },
                {
                  onSuccess: () => {
                    setOpenForm(false);
                    toast.success("Cập nhật thông tin khách hàng thành công!");
                  },
                  onError: (error: any) => {
                    toast.error(
                      error?.message || "Cập nhật thất bại. Vui lòng thử lại.",
                    );
                  },
                },
              );
            }
          }}
        />

        <UserDetailModal
          open={openDetail}
          user={detailUser}
          onClose={() => setOpenDetail(false)}
        />
      </div>
    </BlockErrorBoundary>
  );
}
