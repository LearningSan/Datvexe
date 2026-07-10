"use client";

import { useMemo } from "react";
import { useSeatLayoutDetail } from "@/hooks/admin/useSeatLayouts";
import type {
  SeatLayoutItem,
  SeatLayoutDetailResponse,
} from "@/types/admin/seat-layouts/seat-layout-management.type";
import styles from "./SeatLayoutDetailModal.module.css";

interface Props {
  open: boolean;
  layout: SeatLayoutItem | null;
  onClose: () => void;
  onDuplicate: (layout: SeatLayoutItem) => void;
}

type SeatDetail = SeatLayoutDetailResponse["details"][number];

export default function SeatLayoutDetailModal({
  open,
  layout,
  onClose,
  onDuplicate,
}: Props) {
  const { data, isLoading } = useSeatLayoutDetail(layout?.seatLayoutId);

  const floors = useMemo(() => {
    const result: Record<number, SeatLayoutDetailResponse["details"]> = {};
    const details = data?.details ?? [];

    for (const seat of details) {
      if (!result[seat.floorNo]) result[seat.floorNo] = [];
      result[seat.floorNo].push(seat);
    }

    return result;
  }, [data?.details]);

  const getGridDimensions = (seats: SeatLayoutDetailResponse["details"]) => {
    let maxRow = 0;
    let maxCol = 0;

    seats.forEach((s) => {
      if (s.rowNo > maxRow) maxRow = s.rowNo;
      if (s.columnNo > maxCol) maxCol = s.columnNo;
    });

    return { maxRow, maxCol };
  };

  const sortSeatByPosition = (seats: SeatLayoutDetailResponse["details"]) => {
    return [...seats].sort((a, b) => {
      if (a.rowNo !== b.rowNo) return a.rowNo - b.rowNo;
      return a.columnNo - b.columnNo;
    });
  };

  const renderSeat = (seat: SeatDetail) => {
    const isWC =
      seat.seatType?.toUpperCase() === "WC" ||
      seat.seatNumber?.toUpperCase() === "WC";

    return (
      <div
        key={seat.seatLayoutDetailId}
        className={`${styles.seatWrapper} ${
          isWC
            ? styles.wcNode
            : seat.seatType === "VIP"
              ? styles.vipSeat
              : styles.normalSeat
        }`}
      >
        <div className={styles.seatCap}></div>

        <div className={styles.seatBody}>
          <strong>{seat.seatNumber}</strong>
          <small>{seat.seatType}</small>
        </div>
      </div>
    );
  };

  if (!open || !layout) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <span>CHI TIẾT SƠ ĐỒ GHẾ</span>
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
          <div className={styles.loading}>Đang tải chi tiết...</div>
        ) : (
          <div className={styles.body}>
            <section className={styles.infoSection}>
              <h3>Thông tin cấu hình</h3>

              <div className={styles.infoGrid}>
                <div>
                  <span>Loại xe</span>
                  <strong>{data?.layout.vehicleTypeName}</strong>
                </div>

                <div>
                  <span>Tổng ghế khai báo</span>
                  <strong>{data?.layout.totalSeats} ghế</strong>
                </div>

                <div>
                  <span>Số ghế thực tế</span>
                  <strong>{data?.layout.actualSeats} ghế</strong>
                </div>

                <div>
                  <span>Số tầng</span>
                  <strong>{data?.layout.floorCount} tầng</strong>
                </div>

                <div>
                  <span>Số xe đang dùng</span>
                  <strong>{data?.layout.vehicleCount} xe</strong>
                </div>

                <div>
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
                  ⚠️ Layout này đã được áp dụng vào xe thực tế hoặc có lịch
                  trình chuyến. Bạn không nên thay đổi kết cấu. Hãy nhấn{" "}
                  <strong>Nhân bản sơ đồ</strong> để tạo bản copy mới.
                </div>
              )}
            </section>

            <section className={styles.previewSection}>
              <h3>Mô phỏng sơ đồ thực tế</h3>

              <div className={styles.floorList}>
                {Object.entries(floors).map(([floorNo, seats]) => {
                  const { maxRow, maxCol } = getGridDimensions(seats);

                  const isSleeperBus =
                    maxCol >= 3 &&
                    (layout.layoutName.includes("40") ||
                      layout.totalSeats >= 35);

                  const sortedSeats = sortSeatByPosition(seats);

                  const topSeats = sortedSeats.filter(
                    (seat) => seat.columnNo === 1,
                  );
                  const middleSeats = sortedSeats.filter(
                    (seat) => seat.columnNo === 2,
                  );
                  const bottomSeats = sortedSeats.filter(
                    (seat) => seat.columnNo === 3,
                  );

                  return (
                    <div key={floorNo} className={styles.floorCard}>
                      <h4>Mặt bằng: Tầng {floorNo}</h4>

                      <div className={styles.busCabin}>
                        <div className={styles.busFront}>
                          <div className={styles.busDoor}>
                            CỬA LÊN <span>▼</span>
                          </div>

                          <div className={styles.driverSeat}>
                            <div className={styles.steeringWheel}></div>
                            <span>TÀI XẾ</span>
                          </div>
                        </div>

                        {isSleeperBus ? (
                          <div className={styles.sleeperPreview}>
                            <div className={styles.sleeperRow}>
                              {topSeats.map(renderSeat)}
                            </div>

                            <div
                              className={`${styles.sleeperRow} ${styles.sleeperMiddleRow}`}
                            >
                              {middleSeats.map(renderSeat)}
                            </div>

                            <div className={styles.sleeperRow}>
                              {bottomSeats.map(renderSeat)}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={styles.seatGrid}
                            style={{
                              gridTemplateRows: `repeat(${maxRow}, 1fr)`,
                              gridTemplateColumns: `repeat(${maxCol}, minmax(90px, 1fr))`,
                            }}
                          >
                            {seats.map((seat) => (
                              <div
                                key={seat.seatLayoutDetailId}
                                style={{
                                  gridRow: seat.rowNo,
                                  gridColumn: seat.columnNo,
                                }}
                              >
                                {renderSeat(seat)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={styles.vehicleSection}>
              <h3>Danh sách xe đang dùng layout này</h3>

              <div className={styles.vehicleList}>
                {data?.vehicles.map((vehicle) => (
                  <div key={vehicle.vehicleId} className={styles.vehicleItem}>
                    <strong>{vehicle.licensePlate}</strong>
                    <span>{vehicle.internalCode || "---"}</span>
                    <span>{vehicle.vehicleName || "Chưa đặt tên"}</span>
                    <span className={styles.vStatus}>{vehicle.status}</span>
                  </div>
                ))}

                {data?.vehicles.length === 0 && (
                  <p className={styles.emptyText}>
                    Chưa có xe nào vận hành dựa trên layout này.
                  </p>
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
