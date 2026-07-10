"use client";

import styles from "./TripContainer.module.css";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import FilterSidebar from "@/components/client/trip/filterSidebar/FilterSidebar";
import TripList from "@/components/client/trip/tripList/TripList";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

import { useTripFilterStore } from "@/store/filter.store";
import { useTripSearch, useTripFilterOptions } from "@/hooks/client/useTrip";
import { useBookingStore } from "@/store/booking.store";

import type { Trip } from "@/types/client/trip/trip.type";
import type {
  SortField,
  TripSearchFilters,
} from "@/types/client/trip/trip-filter.type";

export default function TripContainer() {
  const router = useRouter();

  const { filters, setFilters } = useTripFilterStore();
  const { setSelectedTrip, clearSelectedTrip, clearSeats } = useBookingStore();

  const { trips, pagination, isLoading, isFetching } = useTripSearch(filters);

  const [openSort, setOpenSort] = useState<"price" | "departure" | null>(null);

  const loading = isLoading || isFetching;

  useEffect(() => {
    clearSelectedTrip();
    clearSeats();
  }, []);

  // =========================
  // FILTER
  // =========================

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
  const { data: filterOptions } = useTripFilterOptions({
    origin: filters.originCityId ?? undefined,
    destination: filters.destinationCityId ?? undefined,
    date: filters.date || undefined,
  });
  // =========================
  // TRIP
  // =========================

  const handleChooseTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    router.push(`/trips/${trip.id}`);
  };

  return (
    <div className={styles.container}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <BlockErrorBoundary fallback={<div>Lỗi bộ lọc</div>}>
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
        </BlockErrorBoundary>
      </aside>

      {/* MAIN */}
      <main className={styles.main}>
        <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
          <TripList
            trips={trips}
            loading={loading}
            pagination={pagination}
            onPageChange={(page) => setFilters({ page })}
            onChooseTrip={handleChooseTrip}
          />
        </BlockErrorBoundary>
      </main>
    </div>
  );
}
