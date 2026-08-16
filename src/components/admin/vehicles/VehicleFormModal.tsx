"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type {
  AdminVehicleItem,
  AdminVehicleOptionsResponse,
  CreateAdminVehiclePayload,
  UpdateAdminVehiclePayload,
  VehicleStatus,
} from "@/types/admin/vehicles/vehicle-management.type";

import styles from "./VehicleFormModal.module.css";

interface Props {
  open: boolean;
  mode: "CREATE" | "EDIT";
  vehicle: AdminVehicleItem | null;
  options?: AdminVehicleOptionsResponse;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateAdminVehiclePayload | UpdateAdminVehiclePayload,
  ) => void;
}

export default function VehicleFormModal({
  open,
  mode,
  vehicle,
  options,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [internalCode, setInternalCode] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleName, setVehicleName] = useState("");

  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [seatLayoutId, setSeatLayoutId] = useState("");

  const [manufactureYear, setManufactureYear] = useState("");
  const [status, setStatus] = useState<VehicleStatus>("AVAILABLE");
  const [note, setNote] = useState("");

  const isLocked = mode === "EDIT" && !!vehicle?.isLocked;

  // Lắng nghe phím Escape để đóng Modal nhanh (Tăng UX)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    },
    [loading, onClose],
  );

  useEffect(() => {
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  /**
   * Sơ đồ ghế tương ứng với loại xe được chọn.
   */
  const availableLayouts = useMemo(() => {
    if (!vehicleTypeId || !options?.vehicleTypes) {
      return [];
    }

    const map = new Map<number, (typeof options.vehicleTypes)[number]>();

    for (const item of options.vehicleTypes) {
      if (Number(item.vehicleTypeId) === Number(vehicleTypeId)) {
        const seatLayoutId = Number(item.seatLayoutId);

        if (!map.has(seatLayoutId)) {
          map.set(seatLayoutId, item);
        }
      }
    }

    return Array.from(map.values());
  }, [options?.vehicleTypes, vehicleTypeId]);

  /**
   * Layout hiện tại đang được chọn.
   */
  const selectedLayout = useMemo(() => {
    return availableLayouts.find(
      (item) => Number(item.seatLayoutId) === Number(seatLayoutId),
    );
  }, [availableLayouts, seatLayoutId]);

  /**
   * Danh sách các Loại xe không trùng lặp (Unique)
   */
  const uniqueVehicleTypes = useMemo(() => {
    if (!options?.vehicleTypes) return [];

    const map = new Map<number, (typeof options.vehicleTypes)[number]>();

    for (const item of options.vehicleTypes) {
      const vehicleTypeId = Number(item.vehicleTypeId);

      if (!map.has(vehicleTypeId)) {
        map.set(vehicleTypeId, item);
      }
    }

    return Array.from(map.values());
  }, [options?.vehicleTypes]);

  /**
   * Tự động điều chỉnh hoặc reset sơ đồ ghế khi đổi loại xe.
   */
  useEffect(() => {
    if (!vehicleTypeId) {
      setSeatLayoutId("");
      return;
    }

    const currentLayout = options?.vehicleTypes.find(
      (item) =>
        Number(item.vehicleTypeId) === Number(vehicleTypeId) &&
        Number(item.seatLayoutId) === Number(seatLayoutId),
    );

    if (!currentLayout) {
      setSeatLayoutId("");
    }
  }, [vehicleTypeId, options?.vehicleTypes, seatLayoutId]);

  /**
   * Fill hoặc Reset form data
   */
  useEffect(() => {
    if (!open) return;

    if (mode === "EDIT" && vehicle) {
      setInternalCode(vehicle.internalCode || "");
      setLicensePlate(vehicle.licensePlate || "");
      setVehicleName(vehicle.vehicleName || "");

      setVehicleTypeId(String(vehicle.vehicleTypeId));
      setSeatLayoutId(String(vehicle.seatLayoutId));

      setManufactureYear(
        vehicle.manufactureYear ? String(vehicle.manufactureYear) : "",
      );
      setStatus(vehicle.status);
      setNote(vehicle.note || "");
      return;
    }

    // Reset khi chế độ là CREATE
    setInternalCode("");
    setLicensePlate("");
    setVehicleName("");
    setVehicleTypeId("");
    setSeatLayoutId("");
    setManufactureYear("");
    setStatus("AVAILABLE");
    setNote("");
  }, [open, mode, vehicle]);

  if (!open) return null;

  const handleVehicleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setVehicleTypeId(e.target.value);
    setSeatLayoutId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleTypeId || !seatLayoutId) return;

    const payload = {
      internalCode: internalCode.trim() || null,
      licensePlate: licensePlate.trim(),
      vehicleName: vehicleName.trim() || null,
      vehicleTypeId: Number(vehicleTypeId),
      seatLayoutId: Number(seatLayoutId),
      manufactureYear: manufactureYear ? Number(manufactureYear) : null,
      status,
      note: note.trim() || null,
    };

    onSubmit(payload);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()} // Ngăn sự kiện click ra ngoài đóng modal
        role="dialog"
        aria-modal="true"
      >
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <span className={styles.badgeMode}>
              {mode === "CREATE" ? "Tạo mới" : "Cập nhật"}
            </span>
            <h2>Thông tin phương tiện</h2>
            <p>
              {mode === "CREATE"
                ? "Điền thông tin chi tiết để thêm xe mới vào hệ thống"
                : "Chỉnh sửa chi tiết thông tin xe hiện có"}
            </p>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng modal"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Cảnh báo xe bị khóa */}
          {isLocked && (
            <div className={styles.warningBox}>
              <div className={styles.warningIcon}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className={styles.warningContent}>
                <strong>Dữ liệu bị khóa một phần:</strong> Xe đã vận hành hoặc
                có vé đặt. Hệ thống không cho phép sửa <em>Loại xe</em>,{" "}
                <em>Sơ đồ ghế</em> và <em>Năm sản xuất</em>.
              </div>
            </div>
          )}

          {/* MÃ XE + BIỂN SỐ */}
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label htmlFor="internalCode">Mã xe nội bộ</label>
              <input
                id="internalCode"
                value={internalCode}
                onChange={(e) => setInternalCode(e.target.value)}
                placeholder="VD: XE-001"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="licensePlate">
                Biển số xe <span className={styles.required}>*</span>
              </label>
              <input
                id="licensePlate"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                required
                placeholder="VD: 86B-12345"
              />
            </div>
          </div>

          {/* TÊN XE */}
          <div className={styles.formGroup}>
            <label htmlFor="vehicleName">Tên xe hiển thị</label>
            <input
              id="vehicleName"
              value={vehicleName}
              onChange={(e) => setVehicleName(e.target.value)}
              placeholder="VD: Limousine VIP Tuyến Phan Thiết"
            />
          </div>

          {/* LOẠI XE + SƠ ĐỒ GHẾ */}
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label htmlFor="vehicleTypeId">
                Loại xe <span className={styles.required}>*</span>
              </label>
              <select
                id="vehicleTypeId"
                value={vehicleTypeId}
                onChange={handleVehicleTypeChange}
                required
                disabled={isLocked}
              >
                <option value="">-- Chọn loại xe --</option>
                {uniqueVehicleTypes.map((item) => (
                  <option key={item.vehicleTypeId} value={item.vehicleTypeId}>
                    {item.vehicleTypeName}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="seatLayoutId">
                Sơ đồ ghế <span className={styles.required}>*</span>
              </label>
              <select
                id="seatLayoutId"
                value={seatLayoutId}
                onChange={(e) => setSeatLayoutId(e.target.value)}
                required
                disabled={isLocked || !vehicleTypeId}
              >
                <option value="">
                  {!vehicleTypeId
                    ? "-- Vui lòng chọn loại xe --"
                    : "-- Chọn sơ đồ ghế --"}
                </option>
                {availableLayouts.map((item) => (
                  <option key={item.seatLayoutId} value={item.seatLayoutId}>
                    {item.layoutName} ({item.totalSeats} ghế)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* THÔNG TIN CHÍNH XÁC VỀ LAYOUT KHI ĐÃ CHỌN */}
          {selectedLayout && (
            <div className={styles.infoCard}>
              <div className={styles.infoCardItem}>
                <span>Tên cấu hình:</span>
                <strong>{selectedLayout.layoutName}</strong>
              </div>
              <div className={styles.infoCardDivider} />
              <div className={styles.infoCardItem}>
                <span>Tổng số ghế:</span>
                <strong>{selectedLayout.totalSeats} ghế</strong>
              </div>
            </div>
          )}

          {/* TRẠNG THÁI + NĂM SẢN XUẤT */}
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label htmlFor="status">Trạng thái xe</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
              >
                <option value="AVAILABLE">🟢 Khả dụng</option>
                <option value="ASSIGNED">🔵 Đã xếp chuyến</option>
                <option value="MAINTENANCE">🟠 Bảo trì</option>
                <option value="INACTIVE">🔴 Ngưng sử dụng</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="manufactureYear">Năm sản xuất</label>
              <input
                id="manufactureYear"
                type="number"
                value={manufactureYear}
                onChange={(e) => setManufactureYear(e.target.value)}
                min={1900}
                max={new Date().getFullYear() + 1}
                placeholder="VD: 2024"
                disabled={isLocked}
              />
            </div>
          </div>

          {/* GHI CHÚ */}
          <div className={styles.formGroup}>
            <label htmlFor="note">Ghi chú bổ sung</label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="VD: Xe vừa hoàn tất bảo dưỡng định kỳ..."
            />
          </div>

          {/* FOOTER BUTTONS */}
          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !vehicleTypeId || !seatLayoutId}
            >
              {loading ? (
                <span className={styles.spinnerWrapper}>
                  <span className={styles.spinner} />
                  Đang lưu...
                </span>
              ) : mode === "CREATE" ? (
                "Thêm xe mới"
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
