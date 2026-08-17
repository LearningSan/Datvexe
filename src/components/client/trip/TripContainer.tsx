"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import styles from "./TripContainer.module.css";

import FilterSidebar from "@/components/client/trip/filterSidebar/FilterSidebar";
import TripList from "@/components/client/trip/tripList/TripList";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";
import BlockErrorState from "@/components/common/BlockErrorState";

import ErrorRenderer from "@/lib/error/error.renderer";

import { useTripFilterStore } from "@/store/filter.store";
import { useBookingStore } from "@/store/booking.store";
import { useSearchStore } from "@/store/search.store";

import { useTripSearch, useTripFilterOptions } from "@/hooks/client/useTrip";
import { formatDateTimeVN } from "@/lib/client/helpers";
import type { Trip } from "@/types/client/trip/trip.type";

import type {
  SortField,
  TripSearchFilters,
} from "@/types/client/trip/trip-filter.type";

export default function TripContainer() {
  const router = useRouter();
  const { filters, setFilters } = useTripFilterStore();

  const currentSearch = useSearchStore((state) => state.currentSearch);
  const isRoundTripSearch = currentSearch?.isRoundTrip === true;
  const {
    activeJourney,

    outboundTrip,
    returnTrip,
    returnSeats,
    outboundSeats,

    setIsRoundTrip,
    setActiveJourney,
    setSelectedTrip,
  } = useBookingStore();

  const [openSort, setOpenSort] = useState<"price" | "departure" | null>(null);

  /* =========================
     ĐỒNG BỘ KHỨ HỒI
  ========================= */

  useEffect(() => {
    const roundTrip = currentSearch?.isRoundTrip === true;

    setIsRoundTrip(roundTrip);
    setActiveJourney("OUTBOUND");
  }, [currentSearch?.isRoundTrip, setIsRoundTrip, setActiveJourney]);

  const outboundFilters = useMemo<TripSearchFilters>(
    () => ({
      ...filters,

      originCityId: filters.originCityId,

      destinationCityId: filters.destinationCityId,

      date: currentSearch?.departureDate || filters.date,
    }),
    [filters, currentSearch?.departureDate],
  );

  /* =========================
     FILTER CHIỀU VỀ
  ========================= */

  const returnFilters = useMemo<TripSearchFilters>(
    () => ({
      ...filters,

      originCityId: filters.destinationCityId,

      destinationCityId: filters.originCityId,
      date: currentSearch?.isRoundTrip ? (currentSearch.returnDate ?? "") : "",
    }),
    [filters, currentSearch?.isRoundTrip, currentSearch?.returnDate],
  );

  /* =========================
     API gọi chuyến xe
  ========================= */

  const outboundQuery = useTripSearch(outboundFilters);
  const returnQuery = useTripSearch(returnFilters);

  /* =========================
     QUERY ĐANG HIỂN THỊ
  ========================= */

  const activeQuery =
    activeJourney === "OUTBOUND" ? outboundQuery : returnQuery;

  const activeFilters =
    activeJourney === "OUTBOUND" ? outboundFilters : returnFilters;

  const {
    trips,
    pagination,

    isLoading: tripsLoading,
    isFetching: tripsFetching,

    isError: tripsIsError,
    error: tripsError,

    refetch: refetchTrips,
  } = activeQuery;

  /* =========================
     FILTER OPTIONS
  ========================= */

  const {
    data: filterOptions,
    isPending: filterOptionsPending,
    isError: filterOptionsIsError,
    error: filterOptionsError,
    refetch: refetchFilterOptions,
  } = useTripFilterOptions({
    origin: activeFilters.originCityId ?? undefined,

    destination: activeFilters.destinationCityId ?? undefined,

    date: activeFilters.date || undefined,

    requiredSeats: activeFilters.requiredSeats,
  });

  /* =========================
     FILTER ACTIONS
  ========================= */

  const toggleArray = (key: keyof TripSearchFilters, value: string) => {
    const current = filters[key] as string[];

    const exists = current.includes(value);

    const next = exists
      ? current.filter((item) => item !== value)
      : [...current, value];

    setFilters({
      [key]: next,
      page: 1,
    });
  };

  const handleOnlyAvailable = (checked: boolean) => {
    setFilters({
      onlyAvailable: checked,
      page: 1,
    });
  };

  const handleSort = (field: SortField, order: "asc" | "desc") => {
    setFilters({
      sort: {
        field,
        order,
      },

      page: 1,
    });

    setOpenSort(null);
  };
  const resetTripFilters = () => {
    setFilters({
      timeSlots: [],
      vehicleTypes: [],
      seatPositions: [],
      floors: [],
      onlyAvailable: false,
      sort: {
        field: "price",
        order: "asc",
      },
      page: 1,
    });
  };
  const resetFilters = () => {
    resetTripFilters();
  };

  /* =========================
     CHỌN CHUYẾN
  ========================= */

  const handleChooseTrip = (trip: Trip) => {
    setSelectedTrip(trip);

    if (!isRoundTripSearch) {
      router.push("/seats");
      return;
    }

    if (activeJourney === "OUTBOUND") {
      setActiveJourney("RETURN");
      resetTripFilters();
      return;
    }
  };

  /* =========================
     TIẾP TỤC CHỌN GHẾ
  ========================= */

  const handleContinue = () => {
    if (!outboundTrip) return;

    if (isRoundTripSearch && !returnTrip) {
      return;
    }

    /*
     * Bắt đầu chọn ghế từ chuyến đi.
     */
    setActiveJourney("OUTBOUND");
    setSelectedTrip(outboundTrip);

    router.push("/seats");
  };

  if (tripsIsError) {
    return (
      <ErrorRenderer
        error={tripsError}
        onRetry={() => {
          void refetchTrips();
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <BlockErrorBoundary
          fallback={
            <BlockErrorState
              height={400}
              title="Bộ lọc gặp lỗi"
              message="Không thể hiển thị bộ lọc chuyến xe."
            />
          }
        >
          {filterOptionsPending ? (
            <BlockSkeleton height={400} />
          ) : filterOptionsIsError ? (
            <BlockErrorState
              height={400}
              title="Không thể tải bộ lọc"
              message={
                (filterOptionsError as any)?.response?.data?.message ||
                (filterOptionsError as any)?.message ||
                "Bạn vẫn có thể xem danh sách chuyến ở bên cạnh."
              }
              onRetry={() => {
                void refetchFilterOptions();
              }}
            />
          ) : (
            <FilterSidebar
              filters={filters}
              filterOptions={filterOptions}
              openSort={openSort}
              setOpenSort={setOpenSort}
              toggleArray={toggleArray}
              handleOnlyAvailable={handleOnlyAvailable}
              handleSort={handleSort}
              resetFilters={resetFilters}
            />
          )}
        </BlockErrorBoundary>
      </aside>

      {/* MAIN */}
      <main className={styles.main}>
        {/* TAB KHỨ HỒI */}
        {isRoundTripSearch && (
          <div className={styles.journeyTabs}>
            <button
              type="button"
              className={`${styles.journeyTab} ${
                activeJourney === "OUTBOUND" ? styles.journeyTabActive : ""
              }`}
              onClick={() => {
                setActiveJourney("OUTBOUND");
                resetTripFilters();
              }}
            >
              Danh sách chuyến đi
              {outboundTrip && <span className={styles.selectedMark}>✓</span>}
            </button>

            <button
              type="button"
              className={`${styles.journeyTab} ${
                activeJourney === "RETURN" ? styles.journeyTabActive : ""
              }`}
              onClick={() => {
                setActiveJourney("RETURN");
                resetTripFilters();
              }}
            >
              Danh sách chuyến về
              {returnTrip && <span className={styles.selectedMark}>✓</span>}
            </button>
          </div>
        )}

        {/* THÔNG TIN CHUYẾN ĐÃ CHỌN */}
        {isRoundTripSearch && (outboundTrip || returnTrip) && (
          <div className={styles.selectedTrips}>
            <div className={styles.selectedTripRow}>
              <div className={styles.tripLabel}>
                <span className={styles.tripDot} />
                <span>Chuyến đi</span>
              </div>

              {outboundTrip ? (
                <div className={styles.tripInfo}>
                  <strong>
                    {formatDateTimeVN(outboundTrip.departureDateTime)}
                  </strong>

                  <span className={styles.tripRoute}>
                    {outboundTrip.originCity}
                    <span className={styles.arrow}>→</span>
                    {outboundTrip.destinationCity}
                  </span>
                </div>
              ) : (
                <span className={styles.notSelected}>Chưa chọn</span>
              )}
            </div>

            <div className={styles.selectedTripRow}>
              <div className={styles.tripLabel}>
                <span className={`${styles.tripDot} ${styles.returnDot}`} />
                <span>Chuyến về</span>
              </div>

              {returnTrip ? (
                <div className={styles.tripInfo}>
                  <strong>
                    {formatDateTimeVN(returnTrip.departureDateTime)}
                  </strong>

                  <span className={styles.tripRoute}>
                    {returnTrip.originCity}
                    <span className={styles.arrow}>→</span>
                    {returnTrip.destinationCity}
                  </span>
                </div>
              ) : (
                <span className={styles.notSelected}>Chưa chọn</span>
              )}
            </div>

            <button
              type="button"
              className={styles.continueButton}
              disabled={!outboundTrip || !returnTrip}
              onClick={handleContinue}
            >
              Tiếp tục chọn ghế
            </button>
          </div>
        )}

        <BlockErrorBoundary
          fallback={
            <BlockErrorState
              height={500}
              title="Danh sách chuyến gặp lỗi"
              message="Không thể hiển thị danh sách chuyến."
            />
          }
        >
          <TripList
            trips={trips}
            loading={tripsLoading}
            pagination={pagination}
            onPageChange={(page) => {
              setFilters({
                page,
              });
            }}
            onChooseTrip={handleChooseTrip}
          />

          {tripsFetching && !tripsLoading && (
            <div
              style={{
                marginTop: 10,
                color: "#64748b",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              Đang cập nhật danh sách chuyến...
            </div>
          )}
        </BlockErrorBoundary>
      </main>
    </div>
  );
}
