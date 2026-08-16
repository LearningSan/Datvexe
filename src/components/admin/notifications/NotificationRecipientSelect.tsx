"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Check, Loader2, Mail, Phone, Search, User, X } from "lucide-react";
import type { AdminNotificationRecipient } from "@/services/admin/notification.service";
import { useNotificationRecipientSearch } from "@/hooks/admin/useNotificationManagement";

import styles from "./NotificationRecipientSelect.module.css";

interface Props {
  value: number | null;
  onChange: (user: AdminNotificationRecipient | null) => void;
  error?: string;
}

export default function NotificationRecipientSelect({
  value,
  onChange,
  error,
}: Props) {
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] =
    useState<AdminNotificationRecipient | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const usersQuery = useNotificationRecipientSearch(keyword);

  // Reset người dùng đã chọn khi form value bên ngoài xoá (value = null)
  useEffect(() => {
    if (!value) {
      setSelectedUser(null);
    }
  }, [value]);

  // Reset highlight khi danh sách gợi ý thay đổi
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [usersQuery.data]);

  // Click ra ngoài dropdown để đóng
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (user: AdminNotificationRecipient) => {
    setSelectedUser(user);
    onChange(user);
    setKeyword("");
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedUser(null);
    setKeyword("");
    setOpen(false);
    onChange(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputChange = (val: string) => {
    setKeyword(val);
    setOpen(true);

    if (selectedUser) {
      setSelectedUser(null);
      onChange(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !usersQuery.data || usersQuery.data.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < usersQuery.data.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : usersQuery.data.length - 1,
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      const user = usersQuery.data[highlightedIndex];
      if (user) handleSelect(user);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={styles.container}>
      {!selectedUser ? (
        <>
          <div
            className={`${styles.searchBox} ${
              error ? styles.searchBoxError : ""
            } ${open ? styles.searchBoxFocused : ""}`}
          >
            <Search size={17} className={styles.searchIcon} />

            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (keyword.trim().length >= 2) {
                  setOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              className={styles.input}
              autoComplete="off"
            />

            {keyword && !usersQuery.isFetching && (
              <button
                type="button"
                onClick={() => setKeyword("")}
                className={styles.clearKeywordBtn}
                title="Xóa từ khóa"
              >
                <X size={14} />
              </button>
            )}

            {usersQuery.isFetching && (
              <Loader2 size={17} className={styles.spinner} />
            )}
          </div>

          {open && keyword.trim().length >= 2 && (
            <div className={styles.dropdown}>
              {usersQuery.isLoading ? (
                <div className={styles.loading}>
                  <Loader2 size={17} className={styles.spinner} />
                  <span>Đang tìm người nhận...</span>
                </div>
              ) : usersQuery.isError ? (
                <div className={styles.empty}>
                  <User size={18} />
                  <span>
                    {usersQuery.error instanceof Error
                      ? usersQuery.error.message
                      : "Không thể tìm người nhận"}
                  </span>
                </div>
              ) : usersQuery.data?.length === 0 ? (
                <div className={styles.empty}>
                  <User size={18} />
                  <span>Không tìm thấy người dùng</span>
                </div>
              ) : (
                <div className={styles.resultList}>
                  {usersQuery.data?.map((user, index) => (
                    <button
                      key={user.userId}
                      type="button"
                      className={`${styles.resultItem} ${
                        highlightedIndex === index ? styles.highlighted : ""
                      }`}
                      onClick={() => handleSelect(user)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className={styles.resultMeta}>
                        <div className={styles.userNameGroup}>
                          <span className={styles.userName}>
                            {user.fullName}
                          </span>
                          <span className={styles.userIdBadge}>
                            #{user.userId}
                          </span>
                        </div>

                        <div className={styles.userInfo}>
                          {user.email && (
                            <span className={styles.infoTag}>
                              <Mail size={12} /> {user.email}
                            </span>
                          )}
                          {user.phone && (
                            <span className={styles.infoTag}>
                              <Phone size={12} /> {user.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <Check size={16} className={styles.checkIcon} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className={styles.selectedUser}>
          <div className={styles.avatarIcon}>
            <User size={18} />
          </div>

          <div className={styles.selectedInfo}>
            <div className={styles.selectedHeader}>
              <span className={styles.selectedName}>
                {selectedUser.fullName}
              </span>
              <span className={styles.userIdBadge}>
                ID: #{selectedUser.userId}
              </span>
            </div>

            <div className={styles.selectedDetails}>
              {selectedUser.email && (
                <span className={styles.detailItem}>
                  <Mail size={13} /> {selectedUser.email}
                </span>
              )}
              {selectedUser.phone && (
                <span className={styles.detailItem}>
                  <Phone size={13} /> {selectedUser.phone}
                </span>
              )}
              {!selectedUser.email && !selectedUser.phone && (
                <span className={styles.detailItem}>
                  Không có thông tin liên hệ
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label="Bỏ người nhận"
            title="Đổi người nhận khác"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}
