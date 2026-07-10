"use client";

import { useEffect, useState, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

import {
  useCreatePickupPoint,
  usePickupPoints,
  useUpdatePickupPoint,
  useUpdatePickupPointStatus,
} from "@/hooks/admin/usePickupPoints";

import PickupPointFormModal from "./PickupPointFormModal";
import PickupPointDetailModal from "./PickupPointDetailModal";

import type {
  AdminPickupPointItem,
  PickupPointCategory,
  PickupPointStatus,
} from "@/types/admin/pickup-points/pickup-point-management.type";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

import styles from "./PickupPointsContainer.module.css";

type WarningFilter = "" | "MISSING_ROUTE" | "NO_COORDINATE" | "INACTIVE";
type UsageTypeFilter = "" | "PICKUP" | "DROP_OFF" | "BOTH" | "SHUTTLE";

const CATEGORY_MAP: Record<PickupPointCategory, string> = {
  MAIN_HUB: "Bến chính",
  OFFICE: "Văn phòng",
  SHUTTLE_AREA: "Trung chuyển",
  REST_STOP: "Trạm nghỉ",
};

const USAGE_TYPE_MAP: Record<Exclude<UsageTypeFilter, "">, string> = {
  PICKUP: "Điểm đón",
  DROP_OFF: "Điểm trả",
  BOTH: "Đón & trả",
  SHUTTLE: "Trung chuyển",
};

export default function PickupPointsContainer() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    keyword: "",
    cityId: "",
    zoneId: "",
    pointCategory: "" as "" | PickupPointCategory,
    status: "" as "" | PickupPointStatus,
    warning: "" as WarningFilter,
    usageType: "" as UsageTypeFilter,
  });

  const [searchInputValue, setSearchInputValue] = useState("");
  const [page, setPage] = useState(1);

  const [openForm, setOpenForm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<"INFO" | "MAP">("INFO");

  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedPoint, setSelectedPoint] =
    useState<AdminPickupPointItem | null>(null);
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const createMutation = useCreatePickupPoint();
  const updateMutation = useUpdatePickupPoint();
  const statusMutation = useUpdatePickupPointStatus();

  const invalidatePickupPointsList = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-pickup-points"] });
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        const keyword = searchInputValue.trim();
        if (prev.keyword === keyword) return prev;
        setPage(1);
        return { ...prev, keyword };
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInputValue]);

  const { data, isLoading, isError } = usePickupPoints({
    keyword: filters.keyword,
    cityId: filters.cityId ? Number(filters.cityId) : undefined,
    zoneId: filters.zoneId ? Number(filters.zoneId) : undefined,
    pointCategory: filters.pointCategory || undefined,
    status: filters.status || undefined,
    warning: filters.warning || undefined,
    usageType: filters.usageType || undefined,
    page,
    limit: 10,
  });

  const updateSingleFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClearFilter = () => {
    setSearchInputValue("");
    setPage(1);
    setFilters({
      keyword: "",
      cityId: "",
      zoneId: "",
      pointCategory: "",
      status: "",
      warning: "",
      usageType: "",
    });
    toast.success("Đã xóa bộ lọc điểm đón trả");
  };

  const getUsageRoleLabel = (point: AdminPickupPointItem) => {
    if (point.pointCategory === "SHUTTLE_AREA") return "Trung chuyển";

    const hasPickup = point.pickupTripCount > 0 || point.pickupBookingCount > 0;
    const hasDropoff =
      point.dropoffTripCount > 0 || point.dropoffBookingCount > 0;

    if (hasPickup && hasDropoff) return "Đón & trả";
    if (hasPickup) return "Điểm đón";
    if (hasDropoff) return "Điểm trả";

    return "Chưa sử dụng";
  };

  const getWarningLabel = (point: AdminPickupPointItem): string => {
    if (!point.isActive) return "Đang tạm ngưng";
    if (!point.latitude || !point.longitude) return "Thiếu tọa độ";
    if (point.linkedTripCount === 0) return "Chưa gắn chuyến/tuyến";
    return "";
  };

  // Tối ưu hiệu năng phân nhóm bằng useMemo
  const remotePoints = data?.items ?? [];
  const totalPage = Math.ceil((data?.total ?? 0) / 10) || 1;

  const groupedPoints = useMemo(() => {
    return remotePoints.reduce(
      (acc, point) => {
        const cityKey = point.cityName || "Chưa xác định tỉnh thành";
        const zoneKey = point.zoneName || "Chưa xác định khu vực";

        if (!acc[cityKey]) acc[cityKey] = {};
        if (!acc[cityKey][zoneKey]) acc[cityKey][zoneKey] = [];

        acc[cityKey][zoneKey].push(point);
        return acc;
      },
      {} as Record<string, Record<string, AdminPickupPointItem[]>>,
    );
  }, [remotePoints]);

  if (isLoading) return <BlockSkeleton height={500} />;

  if (isError) {
    return (
      <div className={styles.errorWrapper}>
        <p>Không thể tải danh sách điểm đón trả. Vui lòng thử lại.</p>
      </div>
    );
  }

  return (
    <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
      <Toaster position="top-right" />

      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Quản lý điểm đón trả</h1>
            <p>
              Quản lý điểm đón, điểm trả, văn phòng, bến chính và khu vực trung
              chuyển.
            </p>
          </div>

          <button
            className={styles.primaryBtn}
            onClick={() => {
              setFormMode("CREATE");
              setSelectedPoint(null);
              setOpenForm(true);
            }}
          >
            <span className={styles.icon}>+</span> Thêm điểm mới
          </button>
        </div>

        {/* KPI Grid */}
        <div className={styles.kpiGrid}>
          <div
            className={`${styles.kpiCard} ${
              filters.warning === "" && filters.status === ""
                ? styles.kpiCardActive
                : ""
            }`}
            onClick={() => {
              setPage(1);
              setFilters((prev) => ({ ...prev, warning: "", status: "" }));
            }}
          >
            <span className={styles.kpiLabel}>Tổng số điểm</span>
            <strong className={styles.kpiValue}>
              {data?.summary.totalPoints ?? 0}
            </strong>
          </div>

          <div
            className={`${styles.kpiCard} ${filters.status === "ACTIVE" ? styles.kpiCardActive : ""}`}
            onClick={() => {
              setPage(1);
              setFilters((prev) => ({
                ...prev,
                warning: "",
                status: "ACTIVE",
              }));
            }}
          >
            <span className={styles.kpiLabel}>Đang hoạt động</span>
            <strong className={`${styles.kpiValue} ${styles.textSuccess}`}>
              {data?.summary.activePoints ?? 0}
            </strong>
          </div>

          <div
            className={`${styles.kpiCard} ${filters.status === "INACTIVE" ? styles.kpiCardActive : ""}`}
            onClick={() => {
              setPage(1);
              setFilters((prev) => ({
                ...prev,
                warning: "INACTIVE",
                status: "INACTIVE",
              }));
            }}
          >
            <span className={styles.kpiLabel}>Tạm ngưng</span>
            <strong className={`${styles.kpiValue} ${styles.textMuted}`}>
              {data?.summary.inactivePoints ?? 0}
            </strong>
          </div>

          <div
            className={`${styles.kpiCard} ${filters.warning === "MISSING_ROUTE" ? styles.kpiCardActive : ""}`}
            onClick={() => {
              setPage(1);
              setFilters((prev) => ({
                ...prev,
                warning: "MISSING_ROUTE",
                status: "",
              }));
            }}
          >
            <span className={styles.kpiLabel}>Chưa gắn chuyến/tuyến</span>
            <strong className={`${styles.kpiValue} ${styles.textDanger}`}>
              {data?.summary.missingConfigPoints ?? 0}
            </strong>
          </div>

          <div
            className={`${styles.kpiCard} ${filters.warning === "NO_COORDINATE" ? styles.kpiCardActive : ""}`}
            onClick={() => {
              setPage(1);
              setFilters((prev) => ({
                ...prev,
                warning: "NO_COORDINATE",
                status: "",
              }));
            }}
          >
            <span className={styles.kpiLabel}>Thiếu tọa độ</span>
            <strong className={`${styles.kpiValue} ${styles.textDanger}`}>
              {data?.summary.noCoordinatePoints ?? 0}
            </strong>
          </div>
        </div>

        {/* Filter Section */}
        <div className={styles.filterSection}>
          <div className={styles.searchBarRow}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                placeholder="Tìm theo tên điểm, địa chỉ, thành phố, khu vực..."
                className={styles.searchInput}
              />
              {searchInputValue && (
                <button
                  type="button"
                  className={styles.clearTextBtn}
                  onClick={() => setSearchInputValue("")}
                >
                  ✕
                </button>
              )}
            </div>

            {Object.values(filters).some(Boolean) && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClearFilter}
              >
                Xóa tất cả lọc
              </button>
            )}
          </div>

          <div className={styles.filterSelectsRow}>
            <div className={styles.inputGroup}>
              <label>Thành phố (ID)</label>
              <input
                className={styles.smallInput}
                type="number"
                value={filters.cityId}
                onChange={(e) => updateSingleFilter("cityId", e.target.value)}
                placeholder="Ví dụ: 1"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Khu vực (ID)</label>
              <input
                className={styles.smallInput}
                type="number"
                value={filters.zoneId}
                onChange={(e) => updateSingleFilter("zoneId", e.target.value)}
                placeholder="Ví dụ: 2"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Loại địa điểm</label>
              <select
                value={filters.pointCategory}
                onChange={(e) =>
                  updateSingleFilter("pointCategory", e.target.value)
                }
                className={styles.selectInput}
              >
                <option value="">Tất cả loại điểm</option>
                {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Vai trò sử dụng</label>
              <select
                value={filters.usageType}
                onChange={(e) =>
                  updateSingleFilter("usageType", e.target.value)
                }
                className={styles.selectInput}
              >
                <option value="">Tất cả vai trò</option>
                {Object.entries(USAGE_TYPE_MAP).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Trạng thái vận hành</label>
              <select
                value={filters.status}
                onChange={(e) => updateSingleFilter("status", e.target.value)}
                className={styles.selectInput}
              >
                <option value="">Tất cả</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Tạm ngưng</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Cảnh báo</label>
              <select
                value={filters.warning}
                onChange={(e) => updateSingleFilter("warning", e.target.value)}
                className={styles.selectInput}
              >
                <option value="">Tất cả</option>
                <option value="MISSING_ROUTE">Chưa gắn chuyến/tuyến</option>
                <option value="NO_COORDINATE">Thiếu tọa độ</option>
                <option value="INACTIVE">Tạm ngưng</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Presentation */}
        <div className={styles.groupWrapper}>
          {Object.entries(groupedPoints).map(([cityName, zones]) => {
            const cityPointsCount = Object.values(zones).flat().length;

            return (
              <div key={cityName} className={styles.cityGroup}>
                <div className={styles.cityHeader}>
                  <h2>
                    📍 {cityName}{" "}
                    <span className={styles.counterBadge}>
                      {cityPointsCount} điểm
                    </span>
                  </h2>
                </div>

                {Object.entries(zones).map(([zoneName, points]) => (
                  <div key={zoneName} className={styles.zoneGroup}>
                    <div className={styles.zoneHeader}>
                      <h3>🔹 {zoneName}</h3>
                    </div>

                    <div className={styles.tableCard}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Tên điểm / Địa chỉ</th>
                            <th>Loại</th>
                            <th>Vai trò</th>
                            <th style={{ textAlign: "center" }}>Sử dụng</th>
                            <th>Trạng thái</th>
                            <th>Cảnh báo</th>
                            <th style={{ textAlign: "right" }}>Hành động</th>
                          </tr>
                        </thead>

                        <tbody>
                          {points.map((point) => {
                            const warning = getWarningLabel(point);

                            return (
                              <tr
                                key={point.pickupPointId}
                                className={
                                  !point.isActive ? styles.rowDisabled : ""
                                }
                              >
                                <td>
                                  <div className={styles.pointInfo}>
                                    <div>
                                      <div className={styles.pointName}>
                                        {point.pointName}
                                      </div>
                                      <div className={styles.addressText}>
                                        {point.address ??
                                          "Chưa thiết lập địa chỉ chi tiết"}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td>
                                  <span
                                    className={`${styles.categoryBadge} ${styles[point.pointCategory]}`}
                                  >
                                    {CATEGORY_MAP[point.pointCategory] ??
                                      point.pointCategory}
                                  </span>
                                </td>

                                <td>
                                  <span className={styles.categoryBadge}>
                                    {getUsageRoleLabel(point)}
                                  </span>
                                </td>

                                <td style={{ textAlign: "center" }}>
                                  <div className={styles.usageMini}>
                                    <span>Đón: {point.pickupTripCount}</span>
                                    <span>Trả: {point.dropoffTripCount}</span>
                                    <span>
                                      Booking:{" "}
                                      {point.pickupBookingCount +
                                        point.dropoffBookingCount}
                                    </span>
                                  </div>
                                </td>

                                <td>
                                  <span
                                    className={`${styles.statusBadge} ${point.isActive ? styles.active : styles.inactive}`}
                                  >
                                    {point.isActive ? "Hoạt động" : "Tạm ngưng"}
                                  </span>
                                </td>

                                <td>
                                  {warning ? (
                                    <span
                                      className={`${styles.warningBadge} ${!point.isActive ? styles.warningMuted : ""}`}
                                    >
                                      ⚠️ {warning}
                                    </span>
                                  ) : (
                                    <span className={styles.safeText}>
                                      ✓ Đạt chuẩn
                                    </span>
                                  )}
                                </td>

                                <td>
                                  <div className={styles.actionDropdown}>
                                    <button
                                      type="button"
                                      className={styles.actionMenuBtn}
                                      onClick={() =>
                                        setOpenActionId((prev) =>
                                          prev === point.pickupPointId
                                            ? null
                                            : point.pickupPointId,
                                        )
                                      }
                                    >
                                      Thao tác ▾
                                    </button>

                                    {openActionId === point.pickupPointId && (
                                      <div className={styles.actionMenu}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedPoint(point);
                                            setDetailTab("INFO");
                                            setOpenDetail(true);
                                            setOpenActionId(null);
                                          }}
                                        >
                                          Chi tiết
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedPoint(point);
                                            setDetailTab("MAP");
                                            setOpenDetail(true);
                                            setOpenActionId(null);
                                          }}
                                        >
                                          Bản đồ
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFormMode("EDIT");
                                            setSelectedPoint(point);
                                            setOpenForm(true);
                                            setOpenActionId(null);
                                          }}
                                        >
                                          Sửa
                                        </button>

                                        <button
                                          type="button"
                                          className={
                                            point.isActive
                                              ? styles.dangerAction
                                              : styles.successAction
                                          }
                                          disabled={statusMutation.isPending}
                                          onClick={() => {
                                            const nextStatus = !point.isActive;
                                            setOpenActionId(null);

                                            statusMutation.mutate(
                                              {
                                                pickupPointId:
                                                  point.pickupPointId,
                                                isActive: nextStatus,
                                              },
                                              {
                                                onSuccess: () => {
                                                  invalidatePickupPointsList();

                                                  toast.success(
                                                    nextStatus
                                                      ? `Đã kích hoạt điểm "${point.pointName}"`
                                                      : `Đã tạm ngưng điểm "${point.pointName}"`,
                                                  );
                                                },
                                                onError: (error: any) => {
                                                  toast.error(
                                                    error?.message ||
                                                      "Không thể cập nhật trạng thái",
                                                  );
                                                },
                                              },
                                            );
                                          }}
                                        >
                                          {point.isActive
                                            ? "Tạm ngưng"
                                            : "Kích hoạt"}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {remotePoints.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📂</div>
              <p>Không tìm thấy điểm đón trả nào khớp với điều kiện lọc.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={styles.pageBtn}
          >
            Trước
          </button>
          <span className={styles.pageIndicator}>
            Trang <strong>{page}</strong> / {totalPage}
          </span>
          <button
            disabled={page >= totalPage}
            onClick={() => setPage((p) => p + 1)}
            className={styles.pageBtn}
          >
            Sau
          </button>
        </div>

        {/* Modals Protection conditional blocks */}
        {openForm && (
          <PickupPointFormModal
            open={openForm}
            mode={formMode}
            point={selectedPoint}
            loading={createMutation.isPending || updateMutation.isPending}
            onClose={() => setOpenForm(false)}
            onSubmit={(payload) => {
              if (formMode === "CREATE") {
                createMutation.mutate(payload, {
                  onSuccess: () => {
                    invalidatePickupPointsList();
                    setOpenForm(false);
                    toast.success("Tạo điểm đón trả mới thành công");
                  },
                  onError: (error: any) => {
                    toast.error(error?.message || "Không thể tạo điểm đón trả");
                  },
                });
                return;
              }

              if (!selectedPoint?.pickupPointId) return;

              updateMutation.mutate(
                { pickupPointId: selectedPoint.pickupPointId, payload },
                {
                  onSuccess: () => {
                    invalidatePickupPointsList();
                    setOpenForm(false);
                    toast.success("Cập nhật điểm đón trả thành công");
                  },
                  onError: (error: any) => {
                    toast.error(error?.message || "Không thể cập nhật điểm");
                  },
                },
              );
            }}
          />
        )}

        {openDetail && selectedPoint && (
          <PickupPointDetailModal
            open={openDetail}
            point={selectedPoint}
            initialTab={detailTab}
            onClose={() => setOpenDetail(false)}
          />
        )}
      </div>
    </BlockErrorBoundary>
  );
}
