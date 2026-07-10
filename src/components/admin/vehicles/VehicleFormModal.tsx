"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [status, setStatus] = useState<VehicleStatus>("AVAILABLE");
  const [note, setNote] = useState("");

  const selectedType = useMemo(() => {
    return options?.vehicleTypes.find(
      (item) => Number(item.vehicleTypeId) === Number(vehicleTypeId),
    );
  }, [options?.vehicleTypes, vehicleTypeId]);

  const isLocked = mode === "EDIT" && !!vehicle?.isLocked;

  useEffect(() => {
    if (!open) return;

    if (mode === "EDIT" && vehicle) {
      setInternalCode(vehicle.internalCode || "");
      setLicensePlate(vehicle.licensePlate || "");
      setVehicleName(vehicle.vehicleName || "");
      setVehicleTypeId(String(vehicle.vehicleTypeId));
      setStatus(vehicle.status);
      setNote(vehicle.note || "");
      return;
    }

    setInternalCode("");
    setLicensePlate("");
    setVehicleName("");
    setVehicleTypeId("");
    setStatus("AVAILABLE");
    setNote("");
  }, [open, mode, vehicle]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      internalCode: internalCode.trim(),
      licensePlate: licensePlate.trim(),
      vehicleName: vehicleName.trim() || null,
      vehicleTypeId: vehicleTypeId ? Number(vehicleTypeId) : undefined,
      status,
      note: note.trim() || null,
    } as any);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <span>THÔNG TIN XE</span>
            <h2>{mode === "CREATE" ? "Thêm xe mới" : "Sửa thông tin xe"}</h2>
            <p>
              Số ghế không nhập tay. Hệ thống tự lấy theo loại xe và sơ đồ ghế.
            </p>
          </div>

          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Mã xe nội bộ *</label>
              <input
                value={internalCode}
                onChange={(e) => setInternalCode(e.target.value)}
                required
                placeholder="VD: XE-001"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Biển số xe *</label>
              <input
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                required
                placeholder="VD: 86B-12345"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Tên xe</label>
            <input
              value={vehicleName}
              onChange={(e) => setVehicleName(e.target.value)}
              placeholder="VD: Limousine tuyến Phan Thiết"
            />
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Loại xe *</label>
              <select
                value={vehicleTypeId}
                onChange={(e) => setVehicleTypeId(e.target.value)}
                required
                disabled={isLocked}
              >
                <option value="">-- Chọn loại xe --</option>
                {options?.vehicleTypes.map((item) => (
                  <option key={item.vehicleTypeId} value={item.vehicleTypeId}>
                    {item.vehicleTypeName} - {item.totalSeats} ghế
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Trạng thái</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
              >
                <option value="AVAILABLE">Khả dụng</option>
                <option value="ASSIGNED">Đã xếp chuyến</option>
                <option value="MAINTENANCE">Bảo trì</option>
                <option value="INACTIVE">Ngưng sử dụng</option>
              </select>
            </div>
          </div>

          {selectedType && (
            <div className={styles.infoBox}>
              <strong>Sơ đồ ghế tự động:</strong> {selectedType.layoutName} —{" "}
              {selectedType.totalSeats} ghế.
            </div>
          )}

          {isLocked && (
            <div className={styles.warningBox}>
              Xe đã từng có chuyến hoặc booking nên hệ thống khóa loại xe, sơ đồ
              ghế và số ghế. Chỉ được sửa mã xe, biển số, tên xe, trạng thái và
              ghi chú.
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="VD: Xe mới bảo dưỡng, ưu tiên tuyến dài..."
            />
          </div>

          <div className={styles.footer}>
            <button type="button" onClick={onClose} disabled={loading}>
              Hủy
            </button>

            <button type="submit" disabled={loading}>
              {loading
                ? "Đang lưu..."
                : mode === "CREATE"
                  ? "Thêm xe"
                  : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
