"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  X,
  Tag,
  Percent,
  Banknote,
  Calendar,
  AlertCircle,
  Lock,
  Loader2,
  Sparkles,
} from "lucide-react";

import type {
  AdminPromotionItem,
  CreateAdminPromotionPayload,
  UpdateAdminPromotionPayload,
} from "@/types/admin/promotion/promotion-management.type";

import styles from "./PromotionFormModal.module.css";

interface Props {
  open: boolean;
  mode: "CREATE" | "EDIT";
  promotion: AdminPromotionItem | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateAdminPromotionPayload | UpdateAdminPromotionPayload,
  ) => void;
}

export default function PromotionFormModal({
  open,
  mode,
  promotion,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [promoCode, setPromoCode] = useState("");
  const [promotionName, setPromotionName] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(
    "PERCENT",
  );
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [error, setError] = useState("");

  // Khóa cuộn trang & Phím ESC
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, loading, onClose]);

  useEffect(() => {
    if (!open) return;

    if (mode === "EDIT" && promotion) {
      setPromoCode(promotion.promoCode);
      setPromotionName(promotion.promotionName);
      setDiscountType(promotion.discountType);
      setDiscountValue(String(promotion.discountValue));
      setMinOrderAmount(String(promotion.minOrderAmount));
      setStartDate(toDatetimeLocal(promotion.startDate));
      setEndDate(toDatetimeLocal(promotion.endDate));
      setUsageLimit(
        promotion.usageLimit === null ? "" : String(promotion.usageLimit),
      );
    } else {
      setPromoCode("");
      setPromotionName("");
      setDiscountType("PERCENT");
      setDiscountValue("");
      setMinOrderAmount("0");
      setStartDate("");
      setEndDate("");
      setUsageLimit("");
    }

    setError("");
  }, [open, mode, promotion]);

  if (!open) return null;

  const isLocked = mode === "EDIT" && !!promotion && promotion.usageCount > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedCode = promoCode.trim().toUpperCase();
    const value = Number(discountValue);
    const minAmount = Number(minOrderAmount);
    const limit = usageLimit.trim() === "" ? null : Number(usageLimit);

    if (normalizedCode.length < 3) {
      setError("Mã khuyến mãi tối thiểu 3 ký tự.");
      return;
    }

    if (!/^[A-Z0-9_-]+$/.test(normalizedCode)) {
      setError("Mã chỉ được chứa chữ cái, số, dấu - và _");
      return;
    }

    if (promotionName.trim().length < 2) {
      setError("Tên khuyến mãi không hợp lệ (tối thiểu 2 ký tự).");
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      setError("Giá trị giảm phải lớn hơn 0.");
      return;
    }

    if (discountType === "PERCENT" && value > 100) {
      setError("Phần trăm giảm không được vượt quá 100%.");
      return;
    }

    if (!Number.isFinite(minAmount) || minAmount < 0) {
      setError("Giá trị đơn tối thiểu không hợp lệ.");
      return;
    }

    if (!startDate) {
      setError("Vui lòng chọn ngày bắt đầu.");
      return;
    }

    if (!endDate) {
      setError("Vui lòng chọn ngày kết hạn.");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }

    if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
      setError("Giới hạn sử dụng phải là số nguyên lớn hơn 0.");
      return;
    }

    onSubmit({
      promoCode: normalizedCode,
      promotionName: promotionName.trim(),
      discountType,
      discountValue: value,
      minOrderAmount: minAmount,
      startDate,
      endDate,
      usageLimit: limit,
      bannerUrl: promotion?.bannerUrl ?? null,
      bannerPublicId: promotion?.bannerPublicId ?? null,
    });
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.iconBadge}>
              {mode === "CREATE" ? <Sparkles size={20} /> : <Tag size={20} />}
            </div>
            <div>
              <h2>
                {mode === "CREATE"
                  ? "Thêm khuyến mãi mới"
                  : "Chỉnh sửa khuyến mãi"}
              </h2>
              <p>Thiết lập thông tin và cấu hình điều kiện áp dụng</p>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.body}>
            {/* Error Message */}
            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle size={18} className={styles.errorIcon} />
                <span>{error}</span>
              </div>
            )}

            {/* Locked Warning */}
            {isLocked && (
              <div className={styles.warningBanner}>
                <Lock size={18} className={styles.warningIcon} />
                <div>
                  <strong>
                    Mã đã được sử dụng ({promotion.usageCount} lượt)
                  </strong>
                  <p>
                    Để đảm bảo tính minh bạch dữ liệu, mã, loại giảm và giá trị
                    giảm sẽ bị khóa chỉnh sửa.
                  </p>
                </div>
              </div>
            )}

            <div className={styles.formGrid}>
              {/* Promo Code */}
              <div className={styles.field}>
                <label className={styles.label}>
                  Mã khuyến mãi <span className={styles.required}>*</span>
                </label>

                <div className={styles.inputWrapper}>
                  <input
                    className={`${styles.input} ${styles.uppercase}`}
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="VD: SUMMER2026"
                    disabled={loading || isLocked}
                  />
                  {isLocked && (
                    <Lock size={16} className={styles.inputIconRight} />
                  )}
                </div>
              </div>

              {/* Promotion Name */}
              <div className={styles.field}>
                <label className={styles.label}>
                  Tên chương trình <span className={styles.required}>*</span>
                </label>

                <input
                  className={styles.input}
                  value={promotionName}
                  onChange={(e) => setPromotionName(e.target.value)}
                  placeholder="VD: Ưu đãi hè giảm 20%"
                  disabled={loading}
                />
              </div>

              {/* Discount Type */}
              <div className={styles.field}>
                <label className={styles.label}>
                  Loại giảm giá <span className={styles.required}>*</span>
                </label>

                <div className={styles.selectWrapper}>
                  <select
                    className={styles.select}
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as "PERCENT" | "FIXED")
                    }
                    disabled={loading || isLocked}
                  >
                    <option value="PERCENT">Phần trăm (%)</option>
                    <option value="FIXED">Số tiền cố định (VNĐ)</option>
                  </select>
                </div>
              </div>

              {/* Discount Value */}
              <div className={styles.field}>
                <label className={styles.label}>
                  Giá trị giảm <span className={styles.required}>*</span>
                </label>

                <div className={styles.inputAffixGroup}>
                  <input
                    type="number"
                    className={styles.input}
                    min="0"
                    step={discountType === "PERCENT" ? "1" : "1000"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "PERCENT" ? "20" : "50000"}
                    disabled={loading || isLocked}
                  />
                  <span className={styles.affix}>
                    {discountType === "PERCENT" ? "%" : "VNĐ"}
                  </span>
                </div>
              </div>

              {/* Min Order Amount */}
              <div className={styles.field}>
                <label className={styles.label}>Đơn tối thiểu</label>

                <div className={styles.inputAffixGroup}>
                  <input
                    type="number"
                    className={styles.input}
                    min="0"
                    step="1000"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="0"
                    disabled={loading}
                  />
                  <span className={styles.affix}>VNĐ</span>
                </div>
              </div>

              {/* Usage Limit */}
              <div className={styles.field}>
                <label className={styles.label}>Giới hạn sử dụng</label>

                <input
                  type="number"
                  className={styles.input}
                  min="1"
                  step="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Không giới hạn"
                  disabled={loading}
                />
              </div>

              {/* Start Date */}
              <div className={styles.field}>
                <label className={styles.label}>
                  Ngày bắt đầu <span className={styles.required}>*</span>
                </label>

                <input
                  type="datetime-local"
                  className={styles.input}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* End Date */}
              <div className={styles.field}>
                <label className={styles.label}>
                  Ngày hết hạn <span className={styles.required}>*</span>
                </label>

                <input
                  type="datetime-local"
                  className={styles.input}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  <span>Đang xử lý...</span>
                </>
              ) : mode === "CREATE" ? (
                "Tạo khuyến mãi"
              ) : (
                "Lưu thay đổi"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toDatetimeLocal(value: string) {
  if (!value) return "";
  return value.replace(" ", "T").slice(0, 16);
}
