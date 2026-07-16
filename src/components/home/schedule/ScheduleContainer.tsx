"use client";

import { useMemo, useState, useCallback, memo } from "react";
import {
  ArrowLeftRight,
  Bus,
  Clock3,
  MapPinned,
  Route,
  Search,
  Ticket,
  RotateCcw,
  Navigation,
} from "lucide-react";
import { useRouter } from "next/navigation";

import LocationAutocomplete from "@/components/home/LocationAuto/LocationAutocomplete";
import BlockSkeleton from "@/components/common/BlockSkeleton";
import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";

import { useScheduleRoutes } from "@/hooks/client/useRoute";
import type { SelectedLocation } from "@/types/client/route/location-search.type";
import type { ScheduleRouteItem } from "@/types/client/route/schedule-route.type";

import styles from "./ScheduleContainer.module.css";

// Helper Formatters giữ nguyên bên ngoài component
function formatCurrency(value: number) {
  return `${Number(value).toLocaleString("vi-VN")}đ`;
}

function formatDuration(minutes: number) {
  if (!minutes) return "Đang cập nhật";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} phút`;
  if (remainingMinutes === 0) return `${hours} giờ`;
  return `${hours} giờ ${remainingMinutes} phút`;
}

function formatFrequency(route: ScheduleRouteItem) {
  if (route.averageIntervalMinutes && route.averageIntervalMinutes > 0) {
    if (route.averageIntervalMinutes < 60) {
      return `${route.averageIntervalMinutes} phút/chuyến`;
    }
    const hours = Math.floor(route.averageIntervalMinutes / 60);
    const minutes = route.averageIntervalMinutes % 60;
    return minutes === 0
      ? `${hours} giờ/chuyến`
      : `${hours} giờ ${minutes} phút/chuyến`;
  }
  if (route.tripsPerDay > 0) return `${route.tripsPerDay} chuyến/ngày`;
  return "Liên hệ để biết lịch chạy";
}

// 1. COMPONENT CON ĐÃ ĐƯỢC MEMO & TINH CHỈNH LAYOUT
const RouteCard = memo(
  ({
    routeItem,
    onBook,
  }: {
    routeItem: ScheduleRouteItem;
    onBook: (route: ScheduleRouteItem) => void;
  }) => {
    return (
      <article className={styles.routeCard}>
        <div className={styles.routeMain}>
          <div className={styles.routeTop}>
            <div className={styles.routeNames}>
              <span className={styles.stationName}>{routeItem.originName}</span>
              <div className={styles.routeArrow}>
                <span className={styles.arrowLine} />
                <div className={styles.busIconWrapper}>
                  <Bus size={16} />
                </div>
                <span className={styles.arrowLine} />
              </div>
              <span className={styles.stationName}>
                {routeItem.destinationName}
              </span>
            </div>

            <div className={styles.priceBox}>
              <span className={styles.priceLabel}>Giá vé từ</span>
              <strong className={styles.priceValue}>
                {formatCurrency(routeItem.minimumPrice)}
              </strong>
            </div>
          </div>

          {(routeItem.originHub || routeItem.destinationHub) && (
            <div className={styles.hubRow}>
              <Navigation size={14} className={styles.hubIcon} />
              <span className={styles.hubText}>
                {routeItem.originHub ?? routeItem.originName}
                {" → "}
                {routeItem.destinationHub ?? routeItem.destinationName}
              </span>
            </div>
          )}

          <div className={styles.routeStats}>
            <div className={styles.statItem}>
              <div className={styles.statIconWrapper}>
                <MapPinned size={18} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Quãng đường</span>
                <strong className={styles.statValue}>
                  {routeItem.distanceKm > 0
                    ? `${routeItem.distanceKm} km`
                    : "Đang cập nhật"}
                </strong>
              </div>
            </div>

            <div className={styles.statItem}>
              <div className={styles.statIconWrapper}>
                <Clock3 size={18} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Thời gian dự kiến</span>
                <strong className={styles.statValue}>
                  {formatDuration(routeItem.estimatedDurationMinutes)}
                </strong>
              </div>
            </div>

            <div className={styles.statItem}>
              <div className={styles.statIconWrapper}>
                <Route size={18} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Tần suất</span>
                <strong className={styles.statValue}>
                  {formatFrequency(routeItem)}
                </strong>
              </div>
            </div>

            <div className={styles.statItem}>
              <div className={styles.statIconWrapper}>
                <Ticket size={18} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Giờ hoạt động</span>
                <strong className={styles.statValue}>
                  {routeItem.firstDepartureTime && routeItem.lastDepartureTime
                    ? `${routeItem.firstDepartureTime} - ${routeItem.lastDepartureTime}`
                    : "Đang cập nhật"}
                </strong>
              </div>
            </div>
          </div>

          <div className={styles.cardFooter}>
            <div className={styles.vehicleTags}>
              {routeItem.vehicleTypes.length > 0 ? (
                routeItem.vehicleTypes.map((type) => (
                  <span key={type} className={styles.tag}>
                    {type}
                  </span>
                ))
              ) : (
                <span className={styles.tagEmpty}>Đang cập nhật loại xe</span>
              )}
            </div>

            <button
              type="button"
              className={styles.bookButton}
              onClick={() => onBook(routeItem)}
            >
              Đặt vé ngay
              <ArrowLeftRight size={16} />
            </button>
          </div>
        </div>
      </article>
    );
  },
);
RouteCard.displayName = "RouteCard";

// 2. COMPONENT CHÍNH CHỨA STATE
export default function ScheduleContainer() {
  const router = useRouter();

  // Form States (Chỉ thay đổi khi user nhập/chọn)
  const [origin, setOrigin] = useState<SelectedLocation | null>(null);
  const [destination, setDestination] = useState<SelectedLocation | null>(null);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>(
    [],
  );

  // Applied States (Chỉ thay đổi khi nhấn nút "Tìm lịch trình" để call API)
  const [appliedOrigin, setAppliedOrigin] = useState<SelectedLocation | null>(
    null,
  );
  const [appliedDestination, setAppliedDestination] =
    useState<SelectedLocation | null>(null);
  const [appliedVehicleTypes, setAppliedVehicleTypes] = useState<string[]>([]);

  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      originCityId: appliedOrigin?.id,
      destinationCityId: appliedDestination?.id,
      vehicleTypes: appliedVehicleTypes,
      page,
      limit: 8,
    }),
    [appliedOrigin, appliedDestination, appliedVehicleTypes, page],
  );

  const { data, isLoading, isFetching, refetch } = useScheduleRoutes(query);

  const handleSwap = useCallback(() => {
    setOrigin(destination);
    setDestination(origin);
  }, [origin, destination]);

  const handleVehicleTypeChange = useCallback((vehicleType: string) => {
    setSelectedVehicleTypes((current) =>
      current.includes(vehicleType)
        ? current.filter((item) => item !== vehicleType)
        : [...current, vehicleType],
    );
  }, []);

  const handleSearch = useCallback(() => {
    if (origin && destination && origin.id === destination.id) return;

    setPage(1);
    setAppliedOrigin(origin);
    setAppliedDestination(destination);
    setAppliedVehicleTypes(selectedVehicleTypes);
  }, [origin, destination, selectedVehicleTypes]);

  const handleReset = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setSelectedVehicleTypes([]);
    setAppliedOrigin(null);
    setAppliedDestination(null);
    setAppliedVehicleTypes([]);
    setPage(1);
  }, []);

  const handleBookNow = useCallback(
    (routeItem: ScheduleRouteItem) => {
      const params = new URLSearchParams({
        origin: String(routeItem.originCityId),
        destination: String(routeItem.destinationCityId),
        originLabel: routeItem.originName,
        destinationLabel: routeItem.destinationName,
      });
      router.push(`/home?${params.toString()}`);
    },
    [router],
  );

  const routes = data?.routes ?? [];
  const pagination = data?.pagination;
  const sameLocation = origin && destination && origin.id === destination.id;
  const vehicleTypes = data?.filterOptions.vehicleTypes ?? [];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Hành trình của bạn</span>
          <h1>Lịch trình các tuyến xe</h1>
          <p>
            Tra cứu nhanh tuyến đường, loại xe, giá vé và tần suất khởi hành
            trước khi đặt vé.
          </p>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.filterCard}>
          <div className={styles.filterHeading}>
            <div>
              <span className={styles.filterEyebrow}>Tìm kiếm nhanh</span>
              <h2>Bạn muốn đi đâu?</h2>
            </div>
            <button
              type="button"
              className={styles.resetButton}
              onClick={handleReset}
            >
              <RotateCcw size={14} />
              Đặt lại bộ lọc
            </button>
          </div>

          <div className={styles.locationRow}>
            <div className={styles.locationField}>
              <LocationAutocomplete
                label="Điểm đi"
                placeholder="Nhập điểm đi"
                value={origin}
                onSelect={setOrigin}
              />
            </div>

            <button
              type="button"
              className={styles.swapButton}
              onClick={handleSwap}
              aria-label="Đổi điểm đi và điểm đến"
            >
              <ArrowLeftRight size={18} />
            </button>

            <div className={styles.locationField}>
              <LocationAutocomplete
                label="Điểm đến"
                placeholder="Nhập điểm đến"
                value={destination}
                onSelect={setDestination}
              />
            </div>
          </div>

          {sameLocation && (
            <p className={styles.validationMessage}>
              Điểm đi và điểm đến không được trùng nhau.
            </p>
          )}

          <div className={styles.vehicleFilter}>
            <span className={styles.vehicleLabel}>Loại xe</span>
            <div className={styles.vehicleOptions}>
              {vehicleTypes.map((item) => {
                const isSelected = selectedVehicleTypes.includes(item.name);
                return (
                  <label
                    key={item.id}
                    className={`${styles.vehicleOption} ${
                      isSelected ? styles.vehicleOptionActive : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleVehicleTypeChange(item.name)}
                    />
                    {item.name}
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              className={styles.searchButton}
              onClick={handleSearch}
              disabled={Boolean(sameLocation)}
            >
              <Search size={18} />
              Tìm lịch trình
            </button>
          </div>
        </div>

        <div className={styles.listHeader}>
          <div>
            <span className={styles.listEyebrow}>Tuyến đang khai thác</span>
            <h2>Danh sách lịch trình</h2>
          </div>
          {pagination && (
            <span className={styles.resultCount}>
              {pagination.total} tuyến đường
            </span>
          )}
        </div>

        <BlockErrorBoundary
          fallback={
            <div className={styles.skeletonList}>
              <BlockSkeleton height={240} />
              <BlockSkeleton height={240} />
            </div>
          }
        >
          {isLoading ? (
            <div className={styles.skeletonList}>
              <BlockSkeleton height={240} />
              <BlockSkeleton height={240} />
            </div>
          ) : routes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Route size={34} />
              </div>
              <h3>Không tìm thấy tuyến phù hợp</h3>
              <p>
                Hãy thay đổi điểm đi, điểm đến hoặc loại xe để xem thêm lịch
                trình phù hợp nhất.
              </p>
              <button type="button" onClick={() => refetch()}>
                Tải lại
              </button>
            </div>
          ) : (
            <>
              <div
                className={`${styles.routeList} ${isFetching ? styles.fetching : ""}`}
              >
                {routes.map((routeItem) => (
                  <RouteCard
                    key={routeItem.routeId}
                    routeItem={routeItem}
                    onBook={handleBookNow}
                  />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(current - 1, 1))
                    }
                  >
                    Trang trước
                  </button>
                  <span className={styles.paginationIndicator}>
                    Trang <strong>{pagination.page}</strong> trên{" "}
                    <strong>{pagination.totalPages}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </>
          )}
        </BlockErrorBoundary>
      </section>
    </main>
  );
}
