"use client";

import { useEffect, useMemo, useState } from "react";

import { usePickupPointLocationOptions } from "@/hooks/admin/usePickupPoints";

import type {
  AdminPickupPointItem,
  CreateAdminPickupPointPayload,
  PickupPointCategory,
} from "@/types/admin/pickup-points/pickup-point-management.type";

import styles from "./PickupPointFormModal.module.css";

interface Props {
  open: boolean;
  mode: "CREATE" | "EDIT";
  point: AdminPickupPointItem | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateAdminPickupPointPayload) => void;
}

const categoryOptions: {
  value: PickupPointCategory;
  label: string;
}[] = [
  { value: "MAIN_HUB", label: "Bến chính" },
  { value: "OFFICE", label: "Văn phòng" },
  { value: "SHUTTLE_AREA", label: "Khu vực trung chuyển" },
  { value: "REST_STOP", label: "Trạm dừng nghỉ" },
];
const getZoneTypeLabel = (type: string) => {
  switch (type) {
    case "DISTRICT":
      return "Quận/Huyện";

    case "HUB":
      return "Bến trung tâm";

    case "AREA":
      return "Khu vực";

    default:
      return type;
  }
};
export default function PickupPointFormModal({
  open,
  mode,
  point,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [pointName, setPointName] = useState("");
  const [address, setAddress] = useState("");
  const [cityId, setCityId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [pointCategory, setPointCategory] =
    useState<PickupPointCategory>("OFFICE");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const selectedCityId = cityId ? Number(cityId) : undefined;

  const { data: locationOptions, isLoading: optionsLoading } =
    usePickupPointLocationOptions(selectedCityId);

  const cityOptions = locationOptions?.cities ?? [];
  const zoneOptions = locationOptions?.zones ?? [];

  const isUsedPoint =
    mode === "EDIT" &&
    !!point &&
    (point.linkedTripCount > 0 || point.bookingCount > 0);

  const selectedCityName = useMemo(() => {
    return (
      cityOptions.find((city) => city.cityId === Number(cityId))?.cityName ??
      point?.cityName ??
      ""
    );
  }, [cityOptions, cityId, point]);

  const selectedZoneName = useMemo(() => {
    return (
      zoneOptions.find((zone) => zone.zoneId === Number(zoneId))?.zoneName ??
      point?.zoneName ??
      ""
    );
  }, [zoneOptions, zoneId, point]);

  useEffect(() => {
    if (!open) return;

    if (mode === "EDIT" && point) {
      setPointName(point.pointName);
      setAddress(point.address ?? "");
      setCityId(String(point.cityId));
      setZoneId(String(point.zoneId));
      setPointCategory(point.pointCategory);
      setLatitude(point.latitude ? String(point.latitude) : "");
      setLongitude(point.longitude ? String(point.longitude) : "");
      return;
    }

    setPointName("");
    setAddress("");
    setCityId("");
    setZoneId("");
    setPointCategory("OFFICE");
    setLatitude("");
    setLongitude("");
  }, [open, mode, point]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cityId) return;
    if (!zoneId) return;

    onSubmit({
      pointName,
      address: address || null,
      cityId: Number(cityId),
      zoneId: Number(zoneId),
      pointCategory,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2>
              {mode === "CREATE" ? "Thêm điểm đón trả" : "Sửa điểm đón trả"}
            </h2>
            <p>
              Chọn thành phố và khu vực bằng danh sách, không cần nhập ID thủ
              công.
            </p>
          </div>

          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Tên điểm</label>
            <input
              value={pointName}
              onChange={(e) => setPointName(e.target.value)}
              placeholder="Ví dụ: Bến xe Miền Tây"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Địa chỉ</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Nhập địa chỉ điểm đón trả"
            />
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Thành phố</label>

              <select
                value={cityId}
                onChange={(e) => {
                  setCityId(e.target.value);
                  setZoneId("");
                }}
                required
                disabled={isUsedPoint}
              >
                <option value="">
                  {optionsLoading ? "Đang tải..." : "Chọn thành phố"}
                </option>

                {mode === "EDIT" &&
                  point &&
                  !cityOptions.some((city) => city.cityId === point.cityId) && (
                    <option value={point.cityId}>{point.cityName}</option>
                  )}

                {cityOptions.map((city) => (
                  <option key={city.cityId} value={city.cityId}>
                    {city.cityName}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Khu vực</label>

              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                required
                disabled={!cityId || optionsLoading || isUsedPoint}
              >
                <option value="">
                  {!cityId
                    ? "Chọn thành phố trước"
                    : optionsLoading
                      ? "Đang tải khu vực..."
                      : "Chọn khu vực"}
                </option>

                {mode === "EDIT" &&
                  point &&
                  !zoneOptions.some((zone) => zone.zoneId === point.zoneId) && (
                    <option value={point.zoneId}>{point.zoneName}</option>
                  )}

                {zoneOptions.map((zone) => (
                  <option key={zone.zoneId} value={zone.zoneId}>
                    {zone.zoneName} - {getZoneTypeLabel(zone.zoneType)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(selectedCityName || selectedZoneName) && (
            <div className={styles.helperText}>
              Đang cấu hình tại{" "}
              <strong>
                {selectedCityName}
                {selectedZoneName ? ` / ${selectedZoneName}` : ""}
              </strong>
              .
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Loại điểm</label>

            <select
              value={pointCategory}
              onChange={(e) =>
                setPointCategory(e.target.value as PickupPointCategory)
              }
              disabled={isUsedPoint}
            >
              {categoryOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Vĩ độ</label>
              <input
                type="number"
                step="0.0000001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="10.762622"
                disabled={isUsedPoint}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Kinh độ</label>
              <input
                type="number"
                step="0.0000001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="106.660172"
                disabled={isUsedPoint}
              />
            </div>
          </div>

          {isUsedPoint ? (
            <div className={styles.warningBox}>
              Điểm này đã được dùng trong chuyến hoặc booking. Hệ thống khóa
              thành phố, khu vực, loại điểm và tọa độ để tránh sai dữ liệu vận
              hành. Bạn chỉ nên sửa tên hiển thị và địa chỉ.
            </div>
          ) : null}

          <div className={styles.actions}>
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
              disabled={loading || optionsLoading}
            >
              {loading
                ? "Đang lưu..."
                : mode === "CREATE"
                  ? "Thêm điểm"
                  : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
