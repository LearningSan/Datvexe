"use client";

import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import {
  useCreateScheduleTemplate,
  useScheduleOptions,
  useScheduleTemplates,
  useUpdateScheduleTemplate,
  useUpdateScheduleTemplateStatus,
  useGenerateTripsFromSchedule,
} from "@/hooks/admin/useSchedules";

import { useBulkUpdateTripPrice, useCopyTrips } from "@/hooks/admin/useTrips";

import type { AdminScheduleTemplateItem } from "@/types/admin/schedules/schedule-management.type";

import ScheduleTemplateFormModal from "./ScheduleTemplateFormModal";
import GenerateTripsFromScheduleModal from "./GenerateTripsFromScheduleModal";
import CopyTripsModal from "./CopyTripsModal";
import BulkTripPriceModal from "./BulkTripPriceModal";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

import styles from "./ScheduleTemplatesContainer.module.css";

function formatMoney(value: number) {
  return Number(value).toLocaleString("vi-VN") + "đ";
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h <= 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;

  return `${h} giờ ${m} phút`;
}

export default function ScheduleTemplatesContainer() {
  const [keyword, setKeyword] = useState("");
  const [routeId, setRouteId] = useState("");
  const [status, setStatus] = useState<"" | "ACTIVE" | "INACTIVE">("");

  const [appliedFilters, setAppliedFilters] = useState({
    keyword: "",
    routeId: "",
    status: "" as "" | "ACTIVE" | "INACTIVE",
  });

  const [page, setPage] = useState(1);

  const [openForm, setOpenForm] = useState(false);
  const [openGenerate, setOpenGenerate] = useState(false);
  const [openCopy, setOpenCopy] = useState(false);
  const [openBulkPrice, setOpenBulkPrice] = useState(false);

  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedSchedule, setSelectedSchedule] =
    useState<AdminScheduleTemplateItem | null>(null);

  const { data, isLoading, isError } = useScheduleTemplates({
    keyword: appliedFilters.keyword,
    routeId: appliedFilters.routeId
      ? Number(appliedFilters.routeId)
      : undefined,
    status: appliedFilters.status || undefined,
    page,
    limit: 10,
  });

  const { data: options } = useScheduleOptions();

  const createMutation = useCreateScheduleTemplate();
  const updateMutation = useUpdateScheduleTemplate();
  const statusMutation = useUpdateScheduleTemplateStatus();

  const generateMutation = useGenerateTripsFromSchedule();
  const copyMutation = useCopyTrips();
  const bulkPriceMutation = useBulkUpdateTripPrice();

  const handleApplyFilter = () => {
    setPage(1);

    setAppliedFilters({
      keyword: keyword.trim(),
      routeId,
      status,
    });
  };

  const handleClearFilter = () => {
    setKeyword("");
    setRouteId("");
    setStatus("");
    setPage(1);

    setAppliedFilters({
      keyword: "",
      routeId: "",
      status: "",
    });

    toast.success("Đã xóa bộ lọc tìm kiếm");
  };

  const handleQuickStatus = (nextStatus: "" | "ACTIVE" | "INACTIVE") => {
    setPage(1);
    setStatus(nextStatus);

    setAppliedFilters((prev) => ({
      ...prev,
      status: nextStatus,
    }));
  };

  if (isLoading) return <BlockSkeleton height={500} />;

  if (isError) {
    return (
      <div className={styles.errorWrapper}>
        <p>
          Không thể tải danh sách khung giờ chạy. Vui lòng tải lại trang hoặc
          thử lại sau.
        </p>
      </div>
    );
  }

  const totalPage = Math.ceil((data?.total ?? 0) / 10) || 1;

  const groupedSchedules = (data?.items ?? []).reduce(
    (acc, item) => {
      const routeKey = item.routeName || "Tuyến đường chưa xác định";

      if (!acc[routeKey]) acc[routeKey] = [];
      acc[routeKey].push(item);

      return acc;
    },
    {} as Record<string, AdminScheduleTemplateItem[]>,
  );

  return (
    <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
      <Toaster position="top-right" />

      <div className={styles.container}>
        {/* Tiêu đề trang chính */}
        <div className={styles.header}>
          <div>
            <h1>Quản lý khung giờ chạy mẫu</h1>
            <p>
              Cấu hình các giờ chạy cố định cho từng tuyến đường. Tại đây bạn có
              thể tạo chuyến xe tự động hàng loạt, sao chép lịch chạy hoặc điều
              chỉnh giá nhanh cho nhiều chuyến.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.primaryBtn}
              onClick={() => {
                setFormMode("CREATE");
                setSelectedSchedule(null);
                setOpenForm(true);
              }}
            >
              + Thêm giờ chạy mẫu
            </button>
          </div>
        </div>

        {/* Khối thống kê tổng quan (KPI) */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span>Tổng số giờ mẫu</span>
            <strong>{data?.summary.totalSchedules ?? 0}</strong>
          </div>

          <div className={styles.kpiCard}>
            <span>Đang hoạt động</span>
            <strong className={styles.kpiActive}>
              {data?.summary.activeSchedules ?? 0}
            </strong>
          </div>

          <div className={styles.kpiCard}>
            <span>Đang tạm ngưng</span>
            <strong className={styles.kpiInactive}>
              {data?.summary.inactiveSchedules ?? 0}
            </strong>
          </div>

          <div className={styles.kpiCard}>
            <span>Đã dùng tạo chuyến</span>
            <strong>{data?.summary.usedSchedules ?? 0}</strong>
          </div>
        </div>

        {/* Thanh công cụ xử lý hàng loạt giúp kiểm soát tốt hơn */}
        <div className={styles.bulkToolsSection}>
          <span className={styles.bulkToolsTitle}>
            🛠️ Thao tác hàng loạt cho chuyến xe:
          </span>
          <div className={styles.bulkActionButtons}>
            <button
              className={styles.secondaryBtn}
              onClick={() => setOpenGenerate(true)}
            >
              🗓️ Tạo chuyến tự động từ giờ mẫu
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={() => setOpenCopy(true)}
            >
              📑 Sao chép lịch chạy qua ngày mới
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={() => setOpenBulkPrice(true)}
            >
              💰 Thay đổi giá vé hàng loạt
            </button>
          </div>
        </div>

        {/* Bộ lọc trạng thái nhanh */}
        <div className={styles.quickTabs}>
          <button
            className={`${styles.quickTab} ${
              appliedFilters.status === "" ? styles.quickTabActive : ""
            }`}
            onClick={() => handleQuickStatus("")}
          >
            Tất cả giờ chạy
          </button>

          <button
            className={`${styles.quickTab} ${
              appliedFilters.status === "ACTIVE" ? styles.quickTabActive : ""
            }`}
            onClick={() => handleQuickStatus("ACTIVE")}
          >
            🟢 Đang hoạt động
          </button>

          <button
            className={`${styles.quickTab} ${
              appliedFilters.status === "INACTIVE" ? styles.quickTabActive : ""
            }`}
            onClick={() => handleQuickStatus("INACTIVE")}
          >
            🔴 Đang tạm ngưng
          </button>
        </div>

        {/* Bộ tìm kiếm nâng cao */}
        <div className={styles.filters}>
          <input
            className={styles.searchInput}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApplyFilter();
            }}
            placeholder="Tìm kiếm theo tên tuyến..."
          />

          <select
            className={styles.selectInput}
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
          >
            <option value="">-- Tất cả các tuyến đường --</option>
            {options?.routes.map((route) => (
              <option key={route.routeId} value={route.routeId}>
                {route.routeName}
              </option>
            ))}
          </select>

          <select
            className={styles.selectInput}
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "" | "ACTIVE" | "INACTIVE")
            }
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm ngưng</option>
          </select>

          <button className={styles.searchBtn} onClick={handleApplyFilter}>
            Tìm kiếm
          </button>

          <button className={styles.clearBtn} onClick={handleClearFilter}>
            Xóa bộ lọc
          </button>
        </div>

        {/* Danh sách dữ liệu hiển thị chia theo từng tuyến xe */}
        <div className={styles.groupWrapper}>
          {Object.entries(groupedSchedules).map(([routeName, schedules]) => (
            <div key={routeName} className={styles.routeGroup}>
              <div className={styles.routeHeader}>
                <div>
                  <h2>🛣️ {routeName}</h2>
                  <p>Hiện có {schedules.length} khung giờ chạy mẫu cố định</p>
                </div>
              </div>

              <div className={styles.tableCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Giờ xuất bến gốc</th>
                      <th>Thời gian chạy</th>
                      <th>Giá vé cơ bản</th>
                      <th>Tổng chuyến đã chạy</th>
                      <th>Chuyến sắp chạy</th>
                      <th>Trạng thái áp dụng</th>
                      <th style={{ textAlign: "right" }}>
                        Thao tác điều khiển
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {schedules.map((schedule) => (
                      <tr key={schedule.scheduleTemplateId}>
                        <td>
                          <strong className={styles.departureTimeHighlight}>
                            {schedule.departureTime}
                          </strong>
                          <small className={styles.subTextHint}>
                            Khung giờ mặc định
                          </small>
                        </td>

                        <td>
                          <strong>
                            {formatDuration(schedule.estimatedDuration)}
                          </strong>
                          <small className={styles.subTextHint}>
                            Dự kiến {schedule.estimatedDuration} phút
                          </small>
                        </td>

                        <td>
                          <strong className={styles.priceHighlight}>
                            {formatMoney(schedule.basePrice)}
                          </strong>
                        </td>

                        <td>
                          <strong>{schedule.tripCount}</strong>
                          <small className={styles.subTextHint}>
                            chuyến xe
                          </small>
                        </td>

                        <td>
                          <strong
                            className={
                              schedule.upcomingTripCount > 0
                                ? styles.upcomingHasData
                                : ""
                            }
                          >
                            {schedule.upcomingTripCount}
                          </strong>
                          <small className={styles.subTextHint}>
                            chuyến chưa chạy
                          </small>
                        </td>

                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              schedule.isActive
                                ? styles.active
                                : styles.inactive
                            }`}
                          >
                            {schedule.isActive
                              ? "Đang chạy hàng ngày"
                              : "Đã tạm dừng"}
                          </span>
                        </td>

                        <td>
                          <div className={styles.actionGroup}>
                            <button
                              className={styles.editBtn}
                              onClick={() => {
                                setFormMode("EDIT");
                                setSelectedSchedule(schedule);
                                setOpenForm(true);
                              }}
                            >
                              Sửa giờ
                            </button>

                            <button
                              className={
                                schedule.isActive
                                  ? styles.lockBtn
                                  : styles.unlockBtn
                              }
                              disabled={statusMutation.isPending}
                              onClick={() => {
                                const nextStatus = !schedule.isActive;

                                statusMutation.mutate(
                                  {
                                    scheduleTemplateId:
                                      schedule.scheduleTemplateId,
                                    isActive: nextStatus,
                                  },
                                  {
                                    onSuccess: () => {
                                      toast.success(
                                        nextStatus
                                          ? "Đã kích hoạt lại khung giờ chạy này"
                                          : "Đã tạm ngưng áp dụng khung giờ này",
                                      );
                                    },
                                    onError: (error: any) => {
                                      toast.error(
                                        error?.message ||
                                          "Không thể thay đổi trạng thái giờ chạy",
                                      );
                                    },
                                  },
                                );
                              }}
                            >
                              {schedule.isActive
                                ? "Tạm ngưng"
                                : "Kích hoạt lại"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {data?.items.length === 0 && (
            <div className={styles.emptyState}>
              📭 Không tìm thấy khung giờ nào phù hợp với bộ lọc hiện tại.
            </div>
          )}
        </div>

        {/* Thanh phân trang */}
        <div className={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={styles.pageBtn}
          >
            ← Trang trước
          </button>

          <span>
            Trang <strong>{data?.page ?? page}</strong> trên tổng số {totalPage}
          </span>

          <button
            disabled={page >= totalPage}
            onClick={() => setPage((p) => p + 1)}
            className={styles.pageBtn}
          >
            Trang sau →
          </button>
        </div>

        {/* Cửa sổ biểu mẫu: Thêm/Sửa giờ mẫu */}
        <ScheduleTemplateFormModal
          open={openForm}
          mode={formMode}
          schedule={selectedSchedule}
          options={options}
          loading={createMutation.isPending || updateMutation.isPending}
          onClose={() => setOpenForm(false)}
          onSubmit={(payload) => {
            if (formMode === "CREATE") {
              createMutation.mutate(payload as any, {
                onSuccess: () => {
                  setOpenForm(false);
                  toast.success("Thêm mới khung giờ chạy mẫu thành công!");
                },
                onError: (error: any) => {
                  toast.error(
                    error?.message ||
                      "Lỗi dữ liệu, không thể tạo giờ chạy mẫu.",
                  );
                },
              });

              return;
            }

            if (!selectedSchedule?.scheduleTemplateId) return;

            updateMutation.mutate(
              {
                scheduleTemplateId: selectedSchedule.scheduleTemplateId,
                payload: payload as any,
              },
              {
                onSuccess: () => {
                  setOpenForm(false);
                  toast.success("Cập nhật thông tin giờ mẫu thành công!");
                },
                onError: (error: any) => {
                  toast.error(error?.message || "Cập nhật thất bại.");
                },
              },
            );
          }}
        />

        {/* Cửa sổ biểu mẫu: Tạo chuyến xe tự động */}
        <GenerateTripsFromScheduleModal
          open={openGenerate}
          options={options as any}
          loading={generateMutation.isPending}
          onClose={() => setOpenGenerate(false)}
          onSubmit={(payload) => {
            generateMutation.mutate(payload, {
              onSuccess: (result) => {
                setOpenGenerate(false);
                toast.success(
                  `Thành công: Đã tạo tự động ${result.createdCount ?? 0} chuyến xe mới, bỏ qua ${
                    result.skippedCount ?? 0
                  } chuyến đã có sẵn (trùng lịch).`,
                );
              },
              onError: (error: any) => {
                toast.error(
                  error?.message ||
                    "Lỗi hệ thống, không thể tự động tạo chuyến.",
                );
              },
            });
          }}
        />

        {/* Cửa sổ biểu mẫu: Sao chép lịch */}
        <CopyTripsModal
          open={openCopy}
          options={options as any}
          loading={copyMutation.isPending}
          onClose={() => setOpenCopy(false)}
          onSubmit={(payload) => {
            copyMutation.mutate(payload, {
              onSuccess: (result) => {
                setOpenCopy(false);
                toast.success(
                  `Thành công: Đã sao chép ${result.createdCount ?? 0} chuyến xe sang ngày mới, bỏ qua ${
                    result.skippedCount ?? 0
                  } chuyến bị trùng lịch.`,
                );
              },
              onError: (error: any) => {
                toast.error(
                  error?.message || "Lỗi, không thể sao chép dữ liệu lịch.",
                );
              },
            });
          }}
        />

        {/* Cửa sổ biểu mẫu: Cập nhật giá vé loạt lớn */}
        <BulkTripPriceModal
          open={openBulkPrice}
          options={options as any}
          loading={bulkPriceMutation.isPending}
          onClose={() => setOpenBulkPrice(false)}
          onSubmit={(payload) => {
            bulkPriceMutation.mutate(payload, {
              onSuccess: (result) => {
                setOpenBulkPrice(false);
                toast.success(
                  `Đã cập nhật đồng loạt giá vé mới áp dụng cho ${result.updatedCount ?? 0} chuyến xe.`,
                );
              },
              onError: (error: any) => {
                toast.error(
                  error?.message ||
                    "Không thể đổi giá vé đồng loạt, hãy kiểm tra lại.",
                );
              },
            });
          }}
        />
      </div>
    </BlockErrorBoundary>
  );
}
