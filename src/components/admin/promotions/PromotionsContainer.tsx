"use client";

import { useRef, useState } from "react";

import toast from "react-hot-toast";

import {
  useCreatePromotion,
  useDeletePromotion,
  usePromotions,
  useUpdatePromotion,
  useUpdatePromotionStatus,
} from "@/hooks/admin/usePromotions";

import type {
  AdminPromotionItem,
  CreateAdminPromotionPayload,
  UpdateAdminPromotionPayload,
} from "@/types/admin/promotion/promotion-management.type";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

import PromotionFormModal from "./PromotionFormModal";
import PromotionDetailModal from "./PromotionDetailModal";

import styles from "./PromotionsContainer.module.css";

export default function PromotionsContainer() {
  const [keyword, setKeyword] = useState("");

  const [searchKeyword, setSearchKeyword] = useState("");

  const [discountType, setDiscountType] = useState<"" | "PERCENT" | "FIXED">(
    "",
  );

  const [status, setStatus] = useState<"" | "ACTIVE" | "INACTIVE" | "EXPIRED">(
    "",
  );

  const [page, setPage] = useState(1);

  const [openForm, setOpenForm] = useState(false);

  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");

  const [selectedPromotion, setSelectedPromotion] =
    useState<AdminPromotionItem | null>(null);

  const [openDetail, setOpenDetail] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreatePromotion();

  const updateMutation = useUpdatePromotion();

  const statusMutation = useUpdatePromotionStatus();

  const deleteMutation = useDeletePromotion();

  const { data, isLoading, isError } = usePromotions({
    keyword: searchKeyword,
    discountType: discountType || undefined,
    status: status || undefined,
    page,
    limit: 10,
  });

  const items = data?.items ?? [];

  const total = data?.total ?? 0;

  const totalPages = Math.ceil(total / 10) || 1;

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

  const confirmDelete = (promotion: AdminPromotionItem) => {
    toast.custom(
      (t) => (
        <div
          className={`${styles.confirmPopup} ${
            t.visible ? styles.popupEnter : styles.popupLeave
          }`}
        >
          <div className={styles.popupHeader}>
            <span className={styles.popupIcon}>🗑️</span>

            <h3 className={styles.dangerTitle}>Xóa khuyến mãi</h3>
          </div>

          <p className={styles.popupBody}>
            Bạn có chắc chắn muốn xóa khuyến mãi{" "}
            <strong>{promotion.promoCode}</strong> không?
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
              onClick={() => {
                toast.dismiss(t.id);

                deleteMutation.mutate(promotion.promotionId, {
                  onSuccess: () => {
                    toast.success("Xóa khuyến mãi thành công!");
                  },

                  onError: (error: Error) => {
                    toast.error(error.message || "Không thể xóa khuyến mãi");
                  },
                });
              }}
            >
              Xác nhận
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
      },
    );
  };

  const confirmToggleStatus = (promotion: AdminPromotionItem) => {
    const target = !promotion.isActive;

    const action = target ? "kích hoạt" : "vô hiệu hóa";

    toast.custom(
      (t) => (
        <div
          className={`${styles.confirmPopup} ${
            t.visible ? styles.popupEnter : styles.popupLeave
          }`}
        >
          <div className={styles.popupHeader}>
            <span className={styles.popupIcon}>{target ? "🟢" : "🔴"}</span>

            <h3 className={styles.dangerTitle}>
              {target ? "Kích hoạt khuyến mãi" : "Vô hiệu hóa khuyến mãi"}
            </h3>
          </div>

          <p className={styles.popupBody}>
            Bạn có chắc chắn muốn {action} khuyến mãi{" "}
            <strong>{promotion.promoCode}</strong>?
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
              onClick={() => {
                toast.dismiss(t.id);

                statusMutation.mutate(
                  {
                    promotionId: promotion.promotionId,
                    isActive: target,
                  },
                  {
                    onSuccess: () => {
                      toast.success(
                        target
                          ? "Đã kích hoạt khuyến mãi thành công!"
                          : "Đã vô hiệu hóa khuyến mãi thành công!",
                      );
                    },

                    onError: (error: Error) => {
                      toast.error(
                        error.message || "Không thể thay đổi trạng thái",
                      );
                    },
                  },
                );
              }}
            >
              Xác nhận
            </button>
          </div>
        </div>
      ),
      {
        duration: Infinity,
      },
    );
  };

  const handleSubmit = (
    payload: CreateAdminPromotionPayload | UpdateAdminPromotionPayload,
  ) => {
    if (formMode === "CREATE") {
      createMutation.mutate(payload as CreateAdminPromotionPayload, {
        onSuccess: () => {
          setOpenForm(false);

          toast.success("Tạo khuyến mãi thành công! 🎉");
        },

        onError: (error: Error) => {
          toast.error(error.message || "Không thể tạo khuyến mãi");
        },
      });

      return;
    }

    if (!selectedPromotion) {
      return;
    }

    updateMutation.mutate(
      {
        promotionId: selectedPromotion.promotionId,

        payload: payload as UpdateAdminPromotionPayload,
      },
      {
        onSuccess: () => {
          setOpenForm(false);

          toast.success("Cập nhật khuyến mãi thành công!");
        },

        onError: (error: Error) => {
          toast.error(error.message || "Không thể cập nhật khuyến mãi");
        },
      },
    );
  };

  if (isLoading) {
    return <BlockSkeleton height={500} />;
  }

  if (isError) {
    return (
      <div className={styles.errorWrapper}>
        <p>Không thể tải danh sách khuyến mãi. Vui lòng thử lại sau.</p>
      </div>
    );
  }

  return (
    <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Quản lý khuyến mãi</h1>

            <p>
              Quản lý mã giảm giá và chương trình khuyến mãi trong hệ thống.
            </p>
          </div>

          <button
            className={styles.primaryBtn}
            onClick={() => {
              setFormMode("CREATE");
              setSelectedPromotion(null);
              setOpenForm(true);
            }}
          >
            <span className={styles.icon}>+</span>
            Thêm khuyến mãi
          </button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span>Tổng khuyến mãi</span>

            <strong>{total}</strong>
          </div>

          <div className={styles.statCard}>
            <span>Đang hoạt động</span>

            <strong>
              {
                items.filter(
                  (item) =>
                    item.isActive && new Date(item.endDate) > new Date(),
                ).length
              }
            </strong>
          </div>

          <div className={styles.statCard}>
            <span>Đã hết hạn</span>

            <strong>
              {
                items.filter((item) => new Date(item.endDate) <= new Date())
                  .length
              }
            </strong>
          </div>

          <div className={styles.statCard}>
            <span>Đã sử dụng</span>

            <strong>
              {items.reduce(
                (totalUsage, item) => totalUsage + item.usageCount,
                0,
              )}
            </strong>
          </div>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchWrapper}>
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Tìm theo mã hoặc tên khuyến mãi..."
              className={styles.searchInput}
            />

            {keyword && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClearSearch}
              >
                ×
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
            value={discountType}
            onChange={(e) => {
              setPage(1);

              setDiscountType(e.target.value as "" | "PERCENT" | "FIXED");
            }}
            className={styles.selectInput}
          >
            <option value="">Tất cả loại giảm</option>

            <option value="PERCENT">Phần trăm</option>

            <option value="FIXED">Số tiền</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setPage(1);

              setStatus(
                e.target.value as "" | "ACTIVE" | "INACTIVE" | "EXPIRED",
              );
            }}
            className={styles.selectInput}
          >
            <option value="">Tất cả trạng thái</option>

            <option value="ACTIVE">Đang hoạt động</option>

            <option value="INACTIVE">Đã vô hiệu hóa</option>

            <option value="EXPIRED">Đã hết hạn</option>
          </select>
        </div>

        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã khuyến mãi</th>

                <th>Tên khuyến mãi</th>

                <th>Mức giảm</th>

                <th>Thời gian</th>

                <th>Sử dụng</th>

                <th>Trạng thái</th>

                <th
                  style={{
                    textAlign: "right",
                  }}
                >
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyRow}>
                    Không tìm thấy khuyến mãi phù hợp.
                  </td>
                </tr>
              ) : (
                items.map((promotion) => {
                  const expired = new Date(promotion.endDate) <= new Date();

                  return (
                    <tr key={promotion.promotionId}>
                      <td>
                        <strong>{promotion.promoCode}</strong>
                      </td>

                      <td>{promotion.promotionName}</td>

                      <td>
                        {promotion.discountType === "PERCENT"
                          ? `${promotion.discountValue}%`
                          : `${promotion.discountValue.toLocaleString(
                              "vi-VN",
                            )} đ`}
                      </td>

                      <td>
                        <div className={styles.dateInfo}>
                          <span>{formatDate(promotion.startDate)}</span>

                          <small>→</small>

                          <span>{formatDate(promotion.endDate)}</span>
                        </div>
                      </td>

                      <td>
                        {promotion.usageCount}

                        {promotion.usageLimit !== null &&
                          ` / ${promotion.usageLimit}`}
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            expired
                              ? styles.expired
                              : promotion.isActive
                                ? styles.active
                                : styles.inactive
                          }`}
                        >
                          {expired
                            ? "Hết hạn"
                            : promotion.isActive
                              ? "Hoạt động"
                              : "Vô hiệu"}
                        </span>
                      </td>

                      <td>
                        <div className={styles.actionGroup}>
                          <button
                            className={styles.editBtn}
                            onClick={() => {
                              setFormMode("EDIT");

                              setSelectedPromotion(promotion);

                              setOpenForm(true);
                            }}
                          >
                            Sửa
                          </button>

                          <button
                            className={
                              promotion.isActive
                                ? styles.lockBtn
                                : styles.unlockBtn
                            }
                            disabled={statusMutation.isPending || expired}
                            onClick={() => confirmToggleStatus(promotion)}
                          >
                            {promotion.isActive ? "Tắt" : "Bật"}
                          </button>

                          <button
                            className={styles.detailBtn}
                            onClick={() => {
                              setSelectedPromotion(promotion);

                              setOpenDetail(true);
                            }}
                          >
                            Chi tiết
                          </button>

                          <button
                            className={styles.deleteBtn}
                            disabled={deleteMutation.isPending}
                            onClick={() => confirmDelete(promotion)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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

        <PromotionFormModal
          open={openForm}
          mode={formMode}
          promotion={selectedPromotion}
          loading={createMutation.isPending || updateMutation.isPending}
          onClose={() => setOpenForm(false)}
          onSubmit={handleSubmit}
        />

        <PromotionDetailModal
          open={openDetail}
          promotion={selectedPromotion}
          onClose={() => setOpenDetail(false)}
        />
      </div>
    </BlockErrorBoundary>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
