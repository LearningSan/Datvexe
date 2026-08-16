"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  useDuplicateSeatLayout,
  useSeatLayouts,
  useUpdateSeatLayoutStatus,
} from "@/hooks/admin/useSeatLayouts";
import type { SeatLayoutItem } from "@/types/admin/seat-layouts/seat-layout-management.type";
import SeatLayoutDetailModal from "./SeatLayoutDetailModal";
import styles from "./SeatLayoutsContainer.module.css";

interface DuplicateModalData {
  layout: SeatLayoutItem;
  layoutCode: string;
  layoutName: string;
}

export default function SeatLayoutsContainer() {
  const { data, isLoading, isError } = useSeatLayouts();
  const duplicateMutation = useDuplicateSeatLayout();
  const statusMutation = useUpdateSeatLayoutStatus();

  const [selectedLayout, setSelectedLayout] = useState<SeatLayoutItem | null>(
    null,
  );

  // State quản lý Modal nhân bản
  const [duplicateData, setDuplicateData] = useState<DuplicateModalData | null>(
    null,
  );

  // Mở modal nhân bản và set giá trị mặc định
  const handleOpenDuplicateModal = (layout: SeatLayoutItem) => {
    setDuplicateData({
      layout,
      layoutCode: `${layout.layoutCode}_V2`,
      layoutName: `${layout.layoutName} V2`,
    });
  };

  // Xử lý submit nhân bản
  const handleConfirmDuplicate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!duplicateData) return;

    const { layout, layoutCode, layoutName } = duplicateData;

    if (!layoutCode.trim() || !layoutName.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    duplicateMutation.mutate(
      {
        seatLayoutId: layout.seatLayoutId,
        payload: {
          layoutCode: layoutCode.trim(),
          layoutName: layoutName.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success("Nhân bản sơ đồ ghế thành công");
          setDuplicateData(null);
        },
        onError: (error: any) => toast.error(error.message || "Có lỗi xảy ra"),
      },
    );
  };

  const handleToggleStatus = (layout: SeatLayoutItem) => {
    const nextStatus = !layout.isActive;

    statusMutation.mutate(
      {
        seatLayoutId: layout.seatLayoutId,
        isActive: nextStatus,
      },
      {
        onSuccess: () =>
          toast.success(
            nextStatus
              ? "Đã kích hoạt lại sơ đồ ghế"
              : "Đã tạm ngưng sơ đồ ghế",
          ),
        onError: (error: any) => toast.error(error.message || "Có lỗi xảy ra"),
      },
    );
  };

  if (isLoading)
    return <div className={styles.loading}>Đang tải sơ đồ ghế...</div>;

  if (isError) {
    return (
      <div className={styles.error}>Không thể tải danh sách sơ đồ ghế.</div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Quản lý sơ đồ ghế</h1>
          <p>
            Quản lý mẫu ghế dùng để hiển thị cho khách và kiểm tra tính hợp lệ.
          </p>
        </div>
      </div>

      <div className={styles.tableCard}>
        <table>
          <thead>
            <tr>
              <th>Mã layout</th>
              <th>Tên layout</th>
              <th>Loại xe</th>
              <th>Tổng ghế</th>
              <th>Số tầng</th>
              <th>Số xe dùng</th>
              <th>Trạng thái</th>
              <th>Cảnh báo</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {data?.map((layout) => (
              <tr key={layout.seatLayoutId}>
                <td>
                  <strong>{layout.layoutCode}</strong>
                </td>
                <td>{layout.layoutName}</td>
                <td>{layout.vehicleTypeName}</td>
                <td>
                  {layout.actualSeats}/{layout.totalSeats}
                </td>
                <td>{layout.floorCount}</td>
                <td>{layout.vehicleCount}</td>
                <td>
                  <span
                    className={`${styles.status} ${
                      layout.isActive ? styles.active : styles.inactive
                    }`}
                  >
                    {layout.isActive ? "Đang dùng" : "Tạm ngưng"}
                  </span>
                </td>
                <td>
                  <div className={styles.warningList}>
                    {layout.warnings.length > 0
                      ? layout.warnings.map((warning) => (
                          <span key={warning}>{warning}</span>
                        ))
                      : "Ổn"}
                  </div>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button onClick={() => setSelectedLayout(layout)}>
                      Chi tiết
                    </button>

                    <button onClick={() => handleOpenDuplicateModal(layout)}>
                      Nhân bản
                    </button>

                    <button onClick={() => handleToggleStatus(layout)}>
                      {layout.isActive ? "Tạm ngưng" : "Kích hoạt"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {data?.length === 0 && (
              <tr>
                <td colSpan={9} className={styles.empty}>
                  Chưa có sơ đồ ghế nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal xem chi tiết */}
      <SeatLayoutDetailModal
        layout={selectedLayout}
        open={!!selectedLayout}
        onClose={() => setSelectedLayout(null)}
        onDuplicate={handleOpenDuplicateModal}
      />

      {/* Modal Nhân bản Sơ đồ ghế (Thay thế prompt) */}
      {duplicateData && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Nhân bản sơ đồ ghế</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setDuplicateData(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDuplicate}>
              <div className={styles.modalBody}>
                <p className={styles.modalSubtitle}>
                  Tạo bản sao từ sơ đồ{" "}
                  <strong>{duplicateData.layout.layoutName}</strong>
                </p>

                <div className={styles.formGroup}>
                  <label htmlFor="layoutCode">Mã layout mới</label>
                  <input
                    id="layoutCode"
                    type="text"
                    value={duplicateData.layoutCode}
                    onChange={(e) =>
                      setDuplicateData({
                        ...duplicateData,
                        layoutCode: e.target.value,
                      })
                    }
                    placeholder="VD: LAYOUT_BUS_45_V2"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="layoutName">Tên layout mới</label>
                  <input
                    id="layoutName"
                    type="text"
                    value={duplicateData.layoutName}
                    onChange={(e) =>
                      setDuplicateData({
                        ...duplicateData,
                        layoutName: e.target.value,
                      })
                    }
                    placeholder="VD: Sơ đồ 45 chỗ VIP V2"
                    required
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setDuplicateData(null)}
                  disabled={duplicateMutation.isPending}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={duplicateMutation.isPending}
                >
                  {duplicateMutation.isPending
                    ? "Đang xử lý..."
                    : "Xác nhận nhân bản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
