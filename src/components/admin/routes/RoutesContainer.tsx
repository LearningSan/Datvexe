"use client";

import { useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";
import {
  useAdminRouteOptions,
  useAdminRoutes,
  useCreateAdminRoute,
  useDuplicateReverseRoute,
  useUpdateAdminRoute,
  useUpdateAdminRouteStatus,
} from "@/hooks/admin/useRoutes";
import type {
  AdminRouteItem,
  AdminRouteStatus,
} from "@/types/admin/routes/route-management.type";
import RouteFormModal from "./RouteFormModal";
import styles from "./RoutesContainer.module.css";

function formatPrice(value: number | null) {
  if (!value) return "Chưa nhập giá";
  return `${Number(value).toLocaleString("vi-VN")}đ`;
}

function formatDuration(minutes: number | null) {
  if (!minutes) return "---";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}tiếng ${m}phút` : `${h}tiếng`;
}

function getStatusLabel(status: AdminRouteStatus) {
  switch (status) {
    case "ACTIVE":
      return "Đang chạy tốt";
    case "SUSPENDED":
      return "Tạm dừng chạy";
    case "NO_SCHEDULE":
      return "Chưa xếp lịch";
    case "MISSING_CONFIG":
      return "Thiếu thông tin";
    default:
      return status;
  }
}

export default function RoutesContainer() {
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [originCityId, setOriginCityId] = useState("");
  const [destinationCityId, setDestinationCityId] = useState("");
  const [status, setStatus] = useState<"" | AdminRouteStatus>("");
  const [sort, setSort] = useState<
    "NEWEST" | "OLDEST" | "REVENUE_DESC" | "BOOKING_DESC"
  >("NEWEST");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedRoute, setSelectedRoute] = useState<AdminRouteItem | null>(
    null,
  );

  const [openConfirmModal, setOpenConfirmModal] = useState(false);
  const [routeToToggle, setRouteToToggle] = useState<AdminRouteItem | null>(
    null,
  );
  const [toggleReason, setToggleReason] = useState("");
  const [toggleError, setToggleError] = useState("");

  const { data, isLoading, isError } = useAdminRoutes({
    keyword: searchKeyword,
    originCityId: originCityId ? Number(originCityId) : undefined,
    destinationCityId: destinationCityId
      ? Number(destinationCityId)
      : undefined,
    status: status || undefined,
    sort,
    page,
    limit,
  });

  const { data: options } = useAdminRouteOptions();
  const createMutation = useCreateAdminRoute();
  const updateMutation = useUpdateAdminRoute();
  const statusMutation = useUpdateAdminRouteStatus();
  const reverseMutation = useDuplicateReverseRoute();

  // Gom nhóm các tuyến đường theo Tỉnh/Thành phố xuất phát cho dễ nhìn
  const groupedRoutes = useMemo(() => {
    const map = new Map<string, AdminRouteItem[]>();
    for (const route of data?.items ?? []) {
      const key = route.originCityName;
      map.set(key, [...(map.get(key) ?? []), route]);
    }
    return Array.from(map.entries());
  }, [data?.items]);

  const totalPage = Math.ceil((data?.total ?? 0) / limit) || 1;

  const handleSearch = () => {
    setPage(1);
    setSearchKeyword(keyword.trim());
  };

  const handleClearSearch = () => {
    setKeyword("");
    setSearchKeyword("");
    setPage(1);
  };

  const handleOpenConfirmToggle = (route: AdminRouteItem) => {
    setRouteToToggle(route);
    setToggleReason("");
    setToggleError("");
    setOpenConfirmModal(true);
  };

  const handleConfirmToggleStatus = () => {
    if (!routeToToggle) return;
    if (!toggleReason.trim()) {
      setToggleError("Vui lòng nhập lý do để lưu lại lịch sử hệ thống.");
      return;
    }

    const nextStatus =
      routeToToggle.routeStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    statusMutation.mutate(
      {
        routeId: routeToToggle.routeId,
        status: nextStatus,
        reason: toggleReason.trim(),
      },
      {
        onSuccess: () => {
          toast.success(
            nextStatus === "SUSPENDED"
              ? "🔒 Đã tạm dừng hoạt động tuyến xe này"
              : "🔓 Đã mở cho tuyến xe hoạt động trở lại",
          );
          setOpenConfirmModal(false);
          setRouteToToggle(null);
        },
        onError: (error) =>
          toast.error(error?.message || "Thao tác không thành công"),
      },
    );
  };

  if (isLoading) return <BlockSkeleton height={500} />;
  if (isError) {
    return (
      <div className={styles.errorWrapper}>
        <div className={styles.errorCard}>
          <span className={styles.errorIcon}>⚠️</span>
          <p>
            Hệ thống gặp lỗi, không lấy được danh sách tuyến xe. Bạn vui lòng
            thử lại sau nhé!
          </p>
        </div>
      </div>
    );
  }

  return (
    <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
      <Toaster position="top-right" />

      <div className={styles.container}>
        {/* TIÊU ĐỀ TRANG */}
        <div className={styles.header}>
          <div className={styles.brandTitle}>
            <div className={styles.brandIndicator} />
            <div>
              <h1>Quản lý Danh sách Tuyến xe</h1>
              <p>
                Xem thông tin chi tiết đường đi, giá vé sàn, số chuyến chạy và
                số lượng vé bán được.
              </p>
            </div>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={() => {
              setFormMode("CREATE");
              setSelectedRoute(null);
              setOpenForm(true);
            }}
          >
            <span>+</span> Thêm tuyến mới
          </button>
        </div>

        {/* THANH TÌM KIẾM & BỘ LỌC */}
        <div className={styles.filtersCard}>
          <div className={styles.searchWrapper}>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Tìm theo tên bến, tên tuyến đường..."
              className={styles.searchInput}
            />
            {searchKeyword && (
              <button className={styles.clearBtn} onClick={handleClearSearch}>
                &times;
              </button>
            )}
            <button className={styles.searchBtn} onClick={handleSearch}>
              Tìm kiếm
            </button>
          </div>

          <div className={styles.selectGroup}>
            <select
              value={originCityId}
              onChange={(e) => {
                setOriginCityId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">🛫 Tìm nơi đi (Tất cả)</option>
              {(options?.cities ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={destinationCityId}
              onChange={(e) => {
                setDestinationCityId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">🛬 Tìm nơi đến (Tất cả)</option>
              {(options?.cities ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="">⚙️ Trạng thái hoạt động</option>
              <option value="ACTIVE">Đang chạy tốt</option>
              <option value="SUSPENDED">Tạm dừng chạy</option>
              <option value="NO_SCHEDULE">Chưa xếp lịch</option>
              <option value="MISSING_CONFIG">Thiếu thông tin</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
            >
              <option value="NEWEST">🆕 Tuyến mới tạo</option>
              <option value="OLDEST">📆 Tuyến tạo từ lâu</option>
              <option value="REVENUE_DESC">📊 Doanh thu cao nhất</option>
              <option value="BOOKING_DESC">📈 Số lượng khách đông</option>
            </select>
          </div>
        </div>

        {/* DANH SÁCH TUYẾN XE THEO KHU VỰC */}
        <div className={styles.groupsContainer}>
          {groupedRoutes.map(([originName, routes]) => (
            <div key={originName} className={styles.regionCard}>
              <div className={styles.regionHeader}>
                <div className={styles.regionTitleBadge}>NƠI XUẤT PHÁT</div>
                <h2>
                  {originName}{" "}
                  <span className={styles.regionCount}>
                    ({routes.length} tuyến đang có)
                  </span>
                </h2>
              </div>

              <div className={styles.routesGrid}>
                {routes.map((route) => {
                  const statusClass = route.routeStatus.toLowerCase();
                  const occupancyRate = route.scheduleCount
                    ? Math.min(
                        100,
                        (route.soldTicketCount / (route.scheduleCount * 10)) *
                          100,
                      )
                    : 0;

                  return (
                    <div
                      key={route.routeId}
                      className={`${styles.routeRowCard} ${styles[`card-${statusClass}`]}`}
                    >
                      {/* Sơ đồ chặng đi ngắn gọn */}
                      <div className={styles.routeMainInfo}>
                        <div className={styles.visualTimeline}>
                          <div className={styles.nodeCircle}>Đi</div>
                          <div className={styles.dashedLine} />
                          <div
                            className={`${styles.nodeCircle} ${styles.destNode}`}
                          >
                            Đến
                          </div>
                        </div>

                        <div className={styles.pathDetails}>
                          <div className={styles.cityText}>
                            {route.originCityName} &rarr;{" "}
                            {route.destinationCityName}
                          </div>
                          <div className={styles.hubSubtext}>
                            <span title="Bến đi">
                              📍 bến: {route.originHubName ?? "Chưa chọn"}
                            </span>
                            <span className={styles.arrowSpacer}>&rarr;</span>
                            <span title="Bến đến">
                              🏁 bến: {route.destinationHubName ?? "Chưa chọn"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Các thông số cơ bản */}
                      <div className={styles.metricsGrid}>
                        <div className={styles.metricItem}>
                          <span className={styles.metricLabel}>
                            Số km & Thời gian
                          </span>
                          <span className={styles.metricValue}>
                            {route.distanceKm
                              ? `${route.distanceKm} km`
                              : "---"}{" "}
                            /{" "}
                            <small>
                              {formatDuration(route.estimatedDuration)}
                            </small>
                          </span>
                        </div>

                        <div className={styles.metricItem}>
                          <span className={styles.metricLabel}>
                            Giá vé gốc thấp nhất
                          </span>
                          <span
                            className={`${styles.metricValue} ${styles.priceHighlight}`}
                          >
                            {formatPrice(route.basePrice)}
                          </span>
                        </div>

                        {/* Tình hình bán vé */}
                        <div className={styles.metricItem}>
                          <div className={styles.kpiHeader}>
                            <span className={styles.metricLabel}>
                              Số chuyến / Vé bán
                            </span>
                            <span className={styles.kpiNumbers}>
                              <strong>{route.scheduleCount}</strong> chuyến |{" "}
                              <strong>{route.soldTicketCount}</strong> vé
                            </span>
                          </div>
                          <div className={styles.progressBarBg}>
                            <div
                              className={styles.progressBarActive}
                              style={{ width: `${occupancyRate}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Trạng thái & Các nút bấm thao tác */}
                      <div className={styles.rowFooter}>
                        <span
                          className={`${styles.statusBadge} ${styles[statusClass]}`}
                        >
                          <span className={styles.statusDot} />
                          {getStatusLabel(route.routeStatus)}
                        </span>

                        <div className={styles.actionGroup}>
                          <button
                            type="button"
                            className={styles.editBtn}
                            onClick={() => {
                              setFormMode("EDIT");
                              setSelectedRoute(route);
                              setOpenForm(true);
                            }}
                          >
                            ✏️ Sửa thông tin
                          </button>

                          <button
                            type="button"
                            className={styles.reverseBtn}
                            disabled={reverseMutation.isPending}
                            title="Tạo nhanh một tuyến xe chạy ngược lại với các thông tin tương tự"
                            onClick={() => {
                              reverseMutation.mutate(route.routeId, {
                                onSuccess: () =>
                                  toast.success(
                                    "🔄 Đã tạo nhanh tuyến xe chạy chiều về thành công",
                                  ),
                                onError: (err) =>
                                  toast.error(
                                    err?.message ||
                                      "Không tạo được tuyến chiều về",
                                  ),
                              });
                            }}
                          >
                            + Tuyến về
                          </button>

                          <button
                            type="button"
                            className={
                              route.routeStatus === "ACTIVE"
                                ? styles.lockBtn
                                : styles.unlockBtn
                            }
                            onClick={() => handleOpenConfirmToggle(route)}
                          >
                            {route.routeStatus === "ACTIVE"
                              ? "Dừng chạy"
                              : "Cho chạy lại"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {groupedRoutes.length === 0 && (
            <div className={styles.emptyState}>
              📭 Không tìm thấy tuyến xe nào phù hợp với bộ lọc bạn chọn.
            </div>
          )}
        </div>

        {/* PHÂN TRANG */}
        <div className={styles.pagination}>
          <div className={styles.pageLimitSelector}>
            <span>Xem mỗi trang:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10 tuyến</option>
              <option value={20}>20 tuyến</option>
              <option value={50}>50 tuyến</option>
            </select>
          </div>

          <div className={styles.pageButtons}>
            <button disabled={page <= 1} onClick={() => setPage(1)}>
              &laquo;
            </button>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              &lsaquo;
            </button>
            <div className={styles.pageIndicator}>
              Trang <strong>{page}</strong> trên {totalPage}
            </div>
            <button
              disabled={page >= totalPage}
              onClick={() => setPage((p) => p + 1)}
            >
              &rsaquo;
            </button>
            <button
              disabled={page >= totalPage}
              onClick={() => setPage(totalPage)}
            >
              &raquo;
            </button>
          </div>
        </div>

        {/* HỘP THOẠI XÁC NHẬN DỪNG / CHẠY LẠI TUYẾN XE */}
        {openConfirmModal && routeToToggle && (
          <div
            className={styles.modalOverlay}
            onClick={() => setOpenConfirmModal(false)}
          >
            <div
              className={styles.confirmModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.confirmHeader}>
                <div className={styles.warnIcon}>⚠️</div>
                <div>
                  <h3>Bạn muốn thay đổi trạng thái hoạt động?</h3>
                  <p>
                    Tuyến xe: {routeToToggle.originCityName} &rarr;{" "}
                    {routeToToggle.destinationCityName}
                  </p>
                </div>
              </div>

              <div className={styles.confirmBody}>
                <p>
                  Lưu ý: Việc tắt/mở tuyến xe sẽ ảnh hưởng trực tiếp đến việc
                  khách hàng có tìm và đặt được vé trên ứng dụng hay không.
                </p>
                <div className={styles.textareaGroup}>
                  <label>
                    Nhập lý do thay đổi <span className={styles.star}>*</span>
                  </label>
                  <textarea
                    value={toggleReason}
                    onChange={(e) => {
                      setToggleReason(e.target.value);
                      if (e.target.value.trim()) setToggleError("");
                    }}
                    placeholder="Ví dụ: Đường ngập lụt, sửa chữa bến xe, điều chuyển xe sang tuyến khác..."
                    rows={3}
                  />
                  {toggleError && (
                    <p className={styles.errorText}>{toggleError}</p>
                  )}
                </div>
              </div>

              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setOpenConfirmModal(false)}
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  className={styles.executeBtn}
                  onClick={handleConfirmToggleStatus}
                >
                  Xác nhận lưu
                </button>
              </div>
            </div>
          </div>
        )}

        <RouteFormModal
          open={openForm}
          mode={formMode}
          route={selectedRoute}
          cities={options?.cities ?? []}
          hubs={options?.hubs ?? []}
          loading={createMutation.isPending || updateMutation.isPending}
          onClose={() => setOpenForm(false)}
          onSubmit={(payload) => {
            if (formMode === "CREATE") {
              createMutation.mutate(payload, {
                onSuccess: () => {
                  setOpenForm(false);
                  toast.success("🎉 Đã thêm tuyến xe mới thành công");
                },
                onError: (err) =>
                  toast.error(err?.message || "Lỗi khi thêm tuyến xe"),
              });
              return;
            }
            if (!selectedRoute) return;
            updateMutation.mutate(
              { routeId: selectedRoute.routeId, payload },
              {
                onSuccess: () => {
                  setOpenForm(false);
                  toast.success("💾 Đã lưu thay đổi thông tin tuyến xe");
                },
                onError: (err) =>
                  toast.error(err?.message || "Lỗi khi lưu thông tin"),
              },
            );
          }}
        />
      </div>
    </BlockErrorBoundary>
  );
}
