"use client";

import { useEffect, useState } from "react";
import {
  X,
  Copy,
  Check,
  Tag,
  Calendar,
  Percent,
  Banknote,
  Users,
  ShoppingCart,
  Clock,
  Info,
} from "lucide-react";
import type { AdminPromotionItem } from "@/types/admin/promotion/promotion-management.type";
import styles from "./PromotionDetailModal.module.css";

interface Props {
  open: boolean;
  promotion: AdminPromotionItem | null;
  onClose: () => void;
}

export default function PromotionDetailModal({
  open,
  promotion,
  onClose,
}: Props) {
  const [copied, setCopied] = useState(false);

  // Khóa scroll body khi mở modal & hỗ trợ phím ESC
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !promotion) return null;

  const expired = new Date(promotion.endDate) <= new Date();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(promotion.promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy promo code:", err);
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.iconBadge}>
              <Tag size={20} />
            </div>
            <div>
              <h2 id="modal-title">Chi tiết khuyến mãi</h2>
              <p>Thông tin cấu hình và thống kê sử dụng</p>
            </div>
          </div>

          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {/* Banner Mã Khuyến Mãi */}
          <div className={styles.codeCard}>
            <div className={styles.codeInfo}>
              <span className={styles.codeLabel}>Mã áp dụng</span>
              <div className={styles.codeGroup}>
                <strong className={styles.promoCode}>
                  {promotion.promoCode}
                </strong>
                <button
                  className={styles.copyBtn}
                  onClick={handleCopyCode}
                  title="Sao chép mã"
                >
                  {copied ? (
                    <>
                      <Check size={16} className={styles.copiedIcon} />
                      <span>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <span
              className={`${styles.statusBadge} ${
                expired
                  ? styles.expired
                  : promotion.isActive
                    ? styles.active
                    : styles.inactive
              }`}
            >
              <span className={styles.statusDot} />
              {expired
                ? "Hết hạn"
                : promotion.isActive
                  ? "Đang hoạt động"
                  : "Vô hiệu hóa"}
            </span>
          </div>

          {/* Quick Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <Users size={16} />
                <span>Đã sử dụng</span>
              </div>
              <p className={styles.statValue}>
                {promotion.usageCount}
                <span className={styles.statSub}>
                  {promotion.usageLimit
                    ? ` / ${promotion.usageLimit}`
                    : " lượt (không giới hạn)"}
                </span>
              </p>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <ShoppingCart size={16} />
                <span>Đơn tối thiểu</span>
              </div>
              <p className={styles.statValue}>
                {promotion.minOrderAmount.toLocaleString("vi-VN")}
                <span className={styles.statSub}> VNĐ</span>
              </p>
            </div>
          </div>

          {/* Detailed Info Grid */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Chương trình</h3>
            <div className={styles.detailGrid}>
              <DetailItem
                icon={<Info size={16} />}
                label="Tên chương trình"
                value={promotion.promotionName}
              />
              <DetailItem
                icon={
                  promotion.discountType === "PERCENT" ? (
                    <Percent size={16} />
                  ) : (
                    <Banknote size={16} />
                  )
                }
                label="Mức giảm giá"
                value={
                  promotion.discountType === "PERCENT"
                    ? `${promotion.discountValue}%`
                    : `${promotion.discountValue.toLocaleString("vi-VN")} VNĐ`
                }
              />
            </div>
          </div>

          {/* Timeline Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Thời gian áp dụng</h3>
            <div className={styles.timelineCard}>
              <div className={styles.timelineItem}>
                <Calendar size={16} className={styles.timelineIcon} />
                <div>
                  <span className={styles.timelineLabel}>Bắt đầu</span>
                  <strong>{formatDate(promotion.startDate)}</strong>
                </div>
              </div>
              <div className={styles.timelineDivider} />
              <div className={styles.timelineItem}>
                <Clock size={16} className={styles.timelineIcon} />
                <div>
                  <span className={styles.timelineLabel}>Kết thúc</span>
                  <strong>{formatDate(promotion.endDate)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.createdDate}>
            Tạo lúc: {formatDate(promotion.createdAt)}
          </span>
          <button className={styles.closeButton} onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.detailItem}>
      <div className={styles.detailLabelGroup}>
        <span className={styles.detailIcon}>{icon}</span>
        <span>{label}</span>
      </div>
      <strong className={styles.detailValue}>{value}</strong>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
