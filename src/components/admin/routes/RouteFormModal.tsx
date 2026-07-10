"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AdminRouteItem,
  AdminRouteOption,
  AdminRoutePayload,
} from "@/types/admin/routes/route-management.type";
import styles from "./RouteFormModal.module.css";

interface Props {
  open: boolean;
  mode: "CREATE" | "EDIT";
  route: AdminRouteItem | null;
  cities: AdminRouteOption[];
  hubs: AdminRouteOption[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: AdminRoutePayload) => void;
}

interface FormErrors {
  originCityId?: string;
  destinationCityId?: string;
  originHubId?: string;
  destinationHubId?: string;
  distanceKm?: string;
  estimatedDuration?: string;
  basePrice?: string;
  reason?: string;
}

export default function RouteFormModal({
  open,
  mode,
  route,
  cities,
  hubs,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const [originCityId, setOriginCityId] = useState("");
  const [destinationCityId, setDestinationCityId] = useState("");
  const [originHubId, setOriginHubId] = useState("");
  const [destinationHubId, setDestinationHubId] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [reason, setReason] = useState("");

  // Quản lý lỗi validation
  const [errors, setErrors] = useState<FormErrors>({});

  const isLocked = mode === "EDIT" && route?.hasTrips;

  useEffect(() => {
    if (!open) return;

    setOriginCityId(route?.originCityId ? String(route.originCityId) : "");
    setDestinationCityId(
      route?.destinationCityId ? String(route.destinationCityId) : "",
    );
    setOriginHubId(route?.originHubId ? String(route.originHubId) : "");
    setDestinationHubId(
      route?.destinationHubId ? String(route.destinationHubId) : "",
    );
    setDistanceKm(route?.distanceKm ? String(route.distanceKm) : "");
    setEstimatedDuration(
      route?.estimatedDuration ? String(route.estimatedDuration) : "",
    );
    setBasePrice(route?.basePrice ? String(route.basePrice) : "");
    setStatus(route?.routeStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE");
    setReason("");
    setErrors({});
  }, [open, route]);

  const originHubs = useMemo(
    () => hubs.filter((hub) => String(hub.cityId) === originCityId),
    [hubs, originCityId],
  );

  const destinationHubs = useMemo(
    () => hubs.filter((hub) => String(hub.cityId) === destinationCityId),
    [hubs, destinationCityId],
  );

  // Hàm Validate trước khi Submit
  const handleValidateAndSubmit = () => {
    const newErrors: FormErrors = {};

    if (!originCityId)
      newErrors.originCityId = "Vui lòng chọn Tỉnh/Thành phố đi.";
    if (!destinationCityId)
      newErrors.destinationCityId = "Vui lòng chọn Tỉnh/Thành phố đến.";

    if (
      originCityId &&
      destinationCityId &&
      originCityId === destinationCityId
    ) {
      newErrors.destinationCityId = "Điểm đến không được trùng với điểm đi.";
    }

    if (!originHubId)
      newErrors.originHubId = "Vui lòng chọn bến/hub xuất phát.";
    if (!destinationHubId)
      newErrors.destinationHubId = "Vui lòng chọn bến/hub kết thúc.";

    if (!distanceKm || Number(distanceKm) <= 0) {
      newErrors.distanceKm = "Khoảng cách phải lớn hơn 0 km.";
    }
    if (!estimatedDuration || Number(estimatedDuration) <= 0) {
      newErrors.estimatedDuration = "Thời gian di chuyển phải lớn hơn 0 phút.";
    }
    if (!basePrice || Number(basePrice) < 10000) {
      newErrors.basePrice = "Giá vé cơ bản tối thiểu là 10.000đ.";
    }

    if (mode === "EDIT" && !reason.trim()) {
      newErrors.reason = "Vui lòng cung cấp lý do cập nhật thông tin tuyến xe.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; // Dừng lại nếu có lỗi
    }

    // Nếu hợp lệ thì trigger onSubmit gửi dữ liệu lên Server
    onSubmit({
      originCityId: Number(originCityId),
      destinationCityId: Number(destinationCityId),
      originHubId: Number(originHubId),
      destinationHubId: Number(destinationHubId),
      distanceKm: Number(distanceKm),
      estimatedDuration: Number(estimatedDuration),
      basePrice: Number(basePrice),
      status,
      reason: reason.trim(),
    });
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2>
              {mode === "CREATE"
                ? "Thêm tuyến khai thác mới"
                : "Cập nhật tuyến xe"}
            </h2>
            <p>
              {!!isLocked
                ? "🔒 Tuyến đã đi vào vận hành. Điểm đi/đến cố định nhằm bảo toàn dữ liệu lịch sử."
                : "Thiết lập thông tin lộ trình, khoảng cách và giá vé cơ bản."}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {!!isLocked && (
          <div className={styles.warningBox}>
            <strong>Lưu ý:</strong> Tuyến xe này đã có các chuyến chạy cố định.
            Bạn chỉ có thể điều chỉnh giá vé, thời gian dự kiến và khoảng cách.
          </div>
        )}
        <div className={styles.formGrid}>
          {/* Điểm đi */}
          <div className={styles.formGroup}>
            <label>
              Điểm đi <span className={styles.required}>*</span>
            </label>
            <select
              value={originCityId}
              disabled={isLocked}
              onChange={(e) => {
                setOriginCityId(e.target.value);
                setOriginHubId("");
                setErrors((p) => ({ ...p, originCityId: undefined }));
              }}
              className={errors.originCityId ? styles.inputError : ""}
            >
              <option value="">Chọn tỉnh/thành đi</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            {errors.originCityId && (
              <span className={styles.errorText}>{errors.originCityId}</span>
            )}
          </div>

          {/* Điểm đến */}
          <div className={styles.formGroup}>
            <label>
              Điểm đến <span className={styles.required}>*</span>
            </label>
            <select
              value={destinationCityId}
              disabled={isLocked}
              onChange={(e) => {
                setDestinationCityId(e.target.value);
                setDestinationHubId("");
                setErrors((p) => ({ ...p, destinationCityId: undefined }));
              }}
              className={errors.destinationCityId ? styles.inputError : ""}
            >
              <option value="">Chọn tỉnh/thành đến</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
            {errors.destinationCityId && (
              <span className={styles.errorText}>
                {errors.destinationCityId}
              </span>
            )}
          </div>

          {/* Hub đi */}
          <div className={styles.formGroup}>
            <label>
              Bến/Hub đi chính <span className={styles.required}>*</span>
            </label>
            <select
              value={originHubId}
              disabled={isLocked || !originCityId}
              onChange={(e) => {
                setOriginHubId(e.target.value);
                setErrors((p) => ({ ...p, originHubId: undefined }));
              }}
              className={errors.originHubId ? styles.inputError : ""}
            >
              <option value="">Chọn văn phòng/bến xe đi</option>
              {originHubs.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  {hub.name}
                </option>
              ))}
            </select>
            {errors.originHubId && (
              <span className={styles.errorText}>{errors.originHubId}</span>
            )}
          </div>

          {/* Hub đến */}
          <div className={styles.formGroup}>
            <label>
              Bến/Hub đến chính <span className={styles.required}>*</span>
            </label>
            <select
              value={destinationHubId}
              disabled={isLocked || !destinationCityId}
              onChange={(e) => {
                setDestinationHubId(e.target.value);
                setErrors((p) => ({ ...p, destinationHubId: undefined }));
              }}
              className={errors.destinationHubId ? styles.inputError : ""}
            >
              <option value="">Chọn văn phòng/bến xe đến</option>
              {destinationHubs.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  {hub.name}
                </option>
              ))}
            </select>
            {errors.destinationHubId && (
              <span className={styles.errorText}>
                {errors.destinationHubId}
              </span>
            )}
          </div>

          {/* Khoảng cách */}
          <div className={styles.formGroup}>
            <label>
              Khoảng cách (km) <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              min="1"
              value={distanceKm}
              onChange={(e) => {
                setDistanceKm(e.target.value);
                setErrors((p) => ({ ...p, distanceKm: undefined }));
              }}
              placeholder="VD: 320"
              className={errors.distanceKm ? styles.inputError : ""}
            />
            {errors.distanceKm && (
              <span className={styles.errorText}>{errors.distanceKm}</span>
            )}
          </div>

          {/* Thời gian dự kiến */}
          <div className={styles.formGroup}>
            <label>
              Thời gian dự kiến (phút){" "}
              <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              min="1"
              value={estimatedDuration}
              onChange={(e) => {
                setEstimatedDuration(e.target.value);
                setErrors((p) => ({ ...p, estimatedDuration: undefined }));
              }}
              placeholder="VD: 420 (tương đương 7 giờ)"
              className={errors.estimatedDuration ? styles.inputError : ""}
            />
            {errors.estimatedDuration && (
              <span className={styles.errorText}>
                {errors.estimatedDuration}
              </span>
            )}
          </div>

          {/* Giá cơ bản */}
          <div className={styles.formGroup}>
            <label>
              Giá vé cơ bản (VNĐ) <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={basePrice}
              onChange={(e) => {
                setBasePrice(e.target.value);
                setErrors((p) => ({ ...p, basePrice: undefined }));
              }}
              placeholder="VD: 250000"
              className={errors.basePrice ? styles.inputError : ""}
            />
            {errors.basePrice && (
              <span className={styles.errorText}>{errors.basePrice}</span>
            )}
          </div>

          {/* Trạng thái vận hành */}
          <div className={styles.formGroup}>
            <label>Trạng thái vận hành</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="ACTIVE">Hoạt động</option>
              <option value="SUSPENDED">Tạm ngưng</option>
            </select>
          </div>
        </div>

        {/* Lý do sửa đổi (Chỉ hiện khi EDIT) */}
        {mode === "EDIT" && (
          <div className={styles.reasonWrapper}>
            <label>
              Lý do chỉnh sửa dữ liệu <span className={styles.required}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErrors((p) => ({ ...p, reason: undefined }));
              }}
              placeholder="Giải thích lý do thay đổi thông số định mức tuyến (VD: Điều chỉnh theo giá xăng dầu, tối ưu lại lộ trình qua cao tốc mới)..."
              rows={3}
              className={errors.reason ? styles.inputError : ""}
            />
            {errors.reason && (
              <span className={styles.errorText}>{errors.reason}</span>
            )}
          </div>
        )}

        <div className={styles.modalActions}>
          <button
            className={styles.secondaryBtn}
            onClick={onClose}
            disabled={loading}
          >
            Hủy bỏ
          </button>

          <button
            className={styles.primaryBtn}
            disabled={loading}
            onClick={handleValidateAndSubmit}
          >
            {loading ? "Đang xử lý..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
