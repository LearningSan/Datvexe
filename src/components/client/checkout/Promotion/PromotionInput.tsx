"use client";

import { useState } from "react";
import styles from "./PromotionInput.module.css";

interface Props {
  onApply?: (code: string) => Promise<void> | void;
  onClear?: () => void;
  discountText?: string;
}

export default function PromotionInput({
  onApply,
  onClear,
  discountText,
}: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleApply = async () => {
    if (!code.trim()) {
      setError("Vui lòng nhập mã giảm giá");
      return;
    }

    if (!onApply) return;

    try {
      setLoading(true);
      setError("");
      await onApply(code.trim());
    } catch (err: any) {
      setError(err?.message || "Mã giảm giá không hợp lệ");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCode("");
    setError("");
    onClear?.();
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.title}>Mã giảm giá</div>

      <div className={styles.inputRow}>
        <div className={styles.inputWrapper}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Nhập mã giảm giá"
            className={styles.input}
          />

          {/* ✕ clear button INSIDE input */}
          {code && (
            <button
              type="button"
              className={styles.clearIcon}
              onClick={handleClear}
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleApply}
          disabled={loading}
          className={styles.button}
        >
          {loading ? "Đang áp dụng..." : "Áp dụng"}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {discountText && <div className={styles.success}>{discountText}</div>}
    </div>
  );
}
