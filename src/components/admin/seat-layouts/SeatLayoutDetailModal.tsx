"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  useSeatLayoutDetail,
  useUpdateSeatLayoutDetail,
} from "@/hooks/admin/useSeatLayouts";

import type {
  SeatLayoutItem,
  SeatType,
} from "@/types/admin/seat-layouts/seat-layout-management.type";

import type { AdminTicketAvailableSeat } from "@/types/admin/tickets/ticket-management.type";

import SeatMap from "@/components/admin/AdminSeatMap";

import styles from "./SeatLayoutDetailModal.module.css";

interface Props {
  open: boolean;
  layout: SeatLayoutItem | null;
  onClose: () => void;
  onDuplicate: (layout: SeatLayoutItem) => void;
}

export default function SeatLayoutDetailModal({
  open,
  layout,
  onClose,
  onDuplicate,
}: Props) {
  const { data, isLoading } = useSeatLayoutDetail(layout?.seatLayoutId);

  const updateSeatMutation = useUpdateSeatLayoutDetail();

  const [editingSeatId, setEditingSeatId] = useState<number | null>(null);

  const [editSeatNumber, setEditSeatNumber] = useState("");

  const [editSeatType, setEditSeatType] = useState<SeatType>("NORMAL");

  const adminSeats = useMemo<AdminTicketAvailableSeat[]>(() => {
    return (data?.details ?? []).map((seat) => ({
      seatLayoutDetailId: seat.seatLayoutDetailId,
      seatNumber: seat.seatNumber,

      floorNo: seat.floorNo,
      rowNo: seat.rowNo,
      columnNo: seat.columnNo,

      bookingSeatId: null,

      seatStatus: "AVAILABLE",

      isCurrentBooking: false,

      checkinStatus: null,
    }));
  }, [data?.details]);

  const handleSelectSeat = (seatId: number) => {
    if (!data?.details) return;

    const seat = data.details.find(
      (item) => item.seatLayoutDetailId === seatId,
    );

    if (!seat) return;

    // Nếu layout đang được sử dụng thì không cho sửa
    if (data.layout.isLocked) {
      toast.error(
        "Sơ đồ ghế đang được sử dụng, hãy nhân bản trước khi chỉnh sửa",
      );
      return;
    }

    setEditingSeatId(seat.seatLayoutDetailId);
    setEditSeatNumber(seat.seatNumber);
    setEditSeatType(seat.seatType);
  };

  const handleCancelEdit = () => {
    setEditingSeatId(null);
    setEditSeatNumber("");
    setEditSeatType("NORMAL");
  };

  const handleSaveSeat = () => {
    if (!layout || !editingSeatId) return;

    const seatNumber = editSeatNumber.trim();

    if (!seatNumber) {
      toast.error("Vui lòng nhập tên ghế");
      return;
    }

    updateSeatMutation.mutate(
      {
        seatLayoutId: layout.seatLayoutId,

        seatLayoutDetailId: editingSeatId,

        payload: {
          seatNumber,
          seatType: editSeatType,
        },
      },
      {
        onSuccess: () => {
          toast.success("Cập nhật ghế thành công");

          handleCancelEdit();
        },

        onError: (error: any) => {
          toast.error(error.message || "Không thể cập nhật ghế");
        },
      },
    );
  };

  if (!open || !layout) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <span className={styles.headerLabel}>CHI TIẾT SƠ ĐỒ GHẾ</span>

            <h2>{layout.layoutName}</h2>

            <p>{layout.layoutCode}</p>
          </div>

          <button
            type="button"
            className={styles.closeTopBtn}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />

            <span>Đang tải chi tiết...</span>
          </div>
        ) : (
          <div className={styles.body}>
            <section className={styles.infoSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h3>Thông tin cấu hình</h3>

                  <p>Thông tin tổng quan và trạng thái của sơ đồ ghế.</p>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span>Loại xe</span>

                  <strong>{data?.layout.vehicleTypeName ?? "—"}</strong>
                </div>

                <div className={styles.infoItem}>
                  <span>Tổng ghế khai báo</span>

                  <strong>{data?.layout.totalSeats ?? 0} ghế</strong>
                </div>

                <div className={styles.infoItem}>
                  <span>Số ghế thực tế</span>

                  <strong>{data?.layout.actualSeats ?? 0} ghế</strong>
                </div>

                <div className={styles.infoItem}>
                  <span>Số tầng</span>

                  <strong>{data?.layout.floorCount ?? 0} tầng</strong>
                </div>

                <div className={styles.infoItem}>
                  <span>Số xe đang dùng</span>

                  <strong>{data?.layout.vehicleCount ?? 0} xe</strong>
                </div>

                <div className={styles.infoItem}>
                  <span>Trạng thái khóa</span>

                  <strong
                    className={
                      data?.layout.isLocked
                        ? styles.textLocked
                        : styles.textEditable
                    }
                  >
                    {data?.layout.isLocked
                      ? "Đã khóa (đang sử dụng)"
                      : "Có thể chỉnh sửa"}
                  </strong>
                </div>
              </div>

              {data?.layout.isLocked && (
                <div className={styles.warningBox}>
                  <span className={styles.warningIcon}>⚠️</span>

                  <div>
                    <strong>Layout đã được sử dụng</strong>

                    <p>
                      Layout này đã được áp dụng vào xe thực tế hoặc có lịch
                      trình chuyến. Bạn không thể chỉnh sửa ghế trực tiếp. Hãy
                      nhấn <strong>Nhân bản sơ đồ</strong> để tạo bản copy mới.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className={styles.previewSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h3>Mô phỏng sơ đồ thực tế</h3>

                  <p>Click vào ghế để chỉnh sửa tên và loại ghế.</p>
                </div>

                <div className={styles.seatMapSummary}>
                  <span>{adminSeats.length} ghế</span>
                </div>
              </div>

              <div className={styles.seatMapContainer}>
                {adminSeats.length > 0 ? (
                  <SeatMap
                    seats={adminSeats}
                    layoutName={layout.layoutName}
                    mode="ADD"
                    selectedSeatIds={editingSeatId ? [editingSeatId] : []}
                    selectedOldBookingSeatIds={[]}
                    onSelectSeat={handleSelectSeat}
                  />
                ) : (
                  <div className={styles.emptySeatMap}>
                    <span>🪑</span>

                    <strong>Chưa có dữ liệu sơ đồ ghế</strong>

                    <p>Layout này chưa có các vị trí ghế được cấu hình.</p>
                  </div>
                )}
              </div>

              {editingSeatId !== null && (
                <div className={styles.editSeatPanel}>
                  <div className={styles.editSeatHeader}>
                    <div>
                      <h4>Chỉnh sửa ghế</h4>

                      <p>Cập nhật thông tin ghế đang chọn.</p>
                    </div>

                    <button type="button" onClick={handleCancelEdit}>
                      ✕
                    </button>
                  </div>

                  <div className={styles.editSeatForm}>
                    <div className={styles.formGroup}>
                      <label htmlFor="seatNumber">Tên / mã ghế</label>

                      <input
                        id="seatNumber"
                        type="text"
                        value={editSeatNumber}
                        onChange={(e) => setEditSeatNumber(e.target.value)}
                        placeholder="VD: A01"
                        disabled={updateSeatMutation.isPending}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="seatType">Loại ghế</label>

                      <select
                        id="seatType"
                        value={editSeatType}
                        onChange={(e) =>
                          setEditSeatType(e.target.value as SeatType)
                        }
                        disabled={updateSeatMutation.isPending}
                      >
                        <option value="NORMAL">Ghế thường</option>

                        <option value="VIP">Ghế VIP</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.editSeatActions}>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={updateSeatMutation.isPending}
                    >
                      Hủy
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveSeat}
                      disabled={updateSeatMutation.isPending}
                    >
                      {updateSeatMutation.isPending
                        ? "Đang lưu..."
                        : "Lưu thay đổi"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className={styles.vehicleSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <h3>Danh sách xe đang dùng layout này</h3>

                  <p>Các xe hiện đang sử dụng cấu hình sơ đồ ghế này.</p>
                </div>

                <span className={styles.vehicleCount}>
                  {data?.vehicles.length ?? 0} xe
                </span>
              </div>

              <div className={styles.vehicleList}>
                {data?.vehicles.map((vehicle) => (
                  <div key={vehicle.vehicleId} className={styles.vehicleItem}>
                    <div className={styles.vehicleMain}>
                      <strong>{vehicle.licensePlate}</strong>

                      <span>{vehicle.vehicleName || "Chưa đặt tên"}</span>
                    </div>

                    <div className={styles.vehicleMeta}>
                      <span>Mã xe: {vehicle.internalCode || "---"}</span>

                      <span className={styles.vStatus}>{vehicle.status}</span>
                    </div>
                  </div>
                ))}

                {data?.vehicles.length === 0 && (
                  <div className={styles.emptyVehicle}>
                    <span>🚌</span>

                    <div>
                      <strong>Chưa có xe nào sử dụng layout</strong>

                      <p>Layout này hiện chưa được áp dụng cho xe thực tế.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Đóng cửa sổ
          </button>

          <button
            type="button"
            className={styles.duplicateBtn}
            onClick={() => onDuplicate(layout)}
          >
            Nhân bản sơ đồ này
          </button>
        </div>
      </div>
    </div>
  );
}
