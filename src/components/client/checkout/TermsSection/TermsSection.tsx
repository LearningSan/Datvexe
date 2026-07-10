"use client";

import { useState } from "react";
import styles from "./TermsSection.module.css";

import { TERMS_SHORT, TERMS_FULL } from "@/constants/terms";

export default function TermsSection({
  accepted,
  onChange,
  error,
}: {
  accepted: boolean;
  onChange: (value: boolean) => void;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      {/* SHORT */}
      <p className={styles.shortText}>{TERMS_SHORT}</p>

      {/* LINK */}
      <button
        type="button"
        className={styles.link}
        onClick={() => setOpen(true)}
      >
        👉 Xem chi tiết điều khoản
      </button>

      {/* CHECKBOX */}
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>Đồng ý với điều khoản dịch vụ</span>
      </label>

      {/* ERROR */}
      {error && !accepted && (
        <div className={styles.warning}>
          Bạn phải đồng ý điều khoản trước khi đặt vé
        </div>
      )}

      {/* MODAL */}
      {open && (
        <div className={styles.modalOverlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>ĐIỀU KHOẢN DỊCH VỤ ĐẶT VÉ XE</h2>

            <div className={styles.content}>{TERMS_FULL}</div>

            <button className={styles.closeBtn} onClick={() => setOpen(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
