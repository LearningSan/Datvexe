"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  useDuplicateSeatLayout,
  useSeatLayouts,
  useUpdateSeatLayoutStatus,
} from "@/hooks/admin/useSeatLayouts";
import type { SeatLayoutItem } from "@/types/admin/seat-layouts/seat-layout-management.type";
import SeatLayoutDetailModal from "./SeatLayoutDetailModal";
import styles from "./SeatLayoutsContainer.module.css";

export default function SeatLayoutsContainer() {
  const { data, isLoading, isError } = useSeatLayouts();
  const duplicateMutation = useDuplicateSeatLayout();
  const statusMutation = useUpdateSeatLayoutStatus();

  const [selectedLayout, setSelectedLayout] = useState<SeatLayoutItem | null>(
    null,
  );

  const handleDuplicate = (layout: SeatLayoutItem) => {
    const layoutCode = prompt("Nhập mã layout mới:", `${layout.layoutCode}_V2`);

    if (!layoutCode?.trim()) return;

    const layoutName = prompt(
      "Nhập tên layout mới:",
      `${layout.layoutName} V2`,
    );

    if (!layoutName?.trim()) return;

    duplicateMutation.mutate(
      {
        seatLayoutId: layout.seatLayoutId,
        payload: {
          layoutCode: layoutCode.trim(),
          layoutName: layoutName.trim(),
        },
      },
      {
        onSuccess: () => toast.success("Nhân bản sơ đồ ghế thành công"),
        onError: (error: any) => toast.error(error.message),
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
        onError: (error: any) => toast.error(error.message),
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
      <Toaster position="top-right" />

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

                    <button onClick={() => handleDuplicate(layout)}>
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

      <SeatLayoutDetailModal
        layout={selectedLayout}
        open={!!selectedLayout}
        onClose={() => setSelectedLayout(null)}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
