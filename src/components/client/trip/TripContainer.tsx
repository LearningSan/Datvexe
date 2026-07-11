"use client";

import { useEffect, useState } from "react";
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

import { useTripSearch, useTripFilterOptions } from "@/hooks/client/useTrip";

import type { Trip } from "@/types/client/trip/trip.type";
import type {
  SortField,
  TripSearchFilters,
} from "@/types/client/trip/trip-filter.type";

export default function TripContainer() {
  const router = useRouter();

  const { filters, setFilters } = useTripFilterStore();

  const { setSelectedTrip, clearSelectedTrip, clearSeats } = useBookingStore();

  const {
    trips,
    pagination,

    isLoading: tripsLoading,

    // Refetch nền, đổi bộ lọc, đổi trang
    isFetching: tripsFetching,

    // Cần hook trả thêm các field này
    isError: tripsIsError,
    error: tripsError,
    refetch: refetchTrips,
  } = useTripSearch(filters);


  const {
    data: filterOptions,
    isPending: filterOptionsPending,
    isError: filterOptionsIsError,
    error: filterOptionsError,
    refetch: refetchFilterOptions,
  } = useTripFilterOptions({
    origin: filters.originCityId ?? undefined,
    destination: filters.destinationCityId ?? undefined,
    date: filters.date || undefined,
  });

  const [openSort, setOpenSort] = useState<"price" | "departure" | null>(null);

  useEffect(() => {
    clearSelectedTrip();
    clearSeats();
  }, [clearSelectedTrip, clearSeats]);


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

  const resetFilters = () => {
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

  // =========================
  // TRIP
  // =========================

  const handleChooseTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    router.push(`/trips/${trip.id}`);
  };

  // =========================
  // LỖI QUERY CHÍNH
  // =========================

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
      {/* SIDEBAR: QUERY PHỤ */}
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

      {/* MAIN: QUERY CHÍNH */}
      <main className={styles.main}>
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
            /*
             * Không dùng isFetching ở đây.
             * Nếu dùng isLoading || isFetching,
             * mỗi lần đổi trang hoặc bộ lọc có thể hiện skeleton lại.
             */
            loading={tripsLoading}
            pagination={pagination}
            onPageChange={(page) => {
              setFilters({ page });
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
