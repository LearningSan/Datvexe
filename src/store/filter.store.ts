import { create } from "zustand";

import { persist, createJSONStorage } from "zustand/middleware";

import type { TripSearchFilters } from "@/types/client/trip/trip-filter.type";

interface TripFilterStore {
  filters: TripSearchFilters;

  setFilters: (filters: Partial<TripSearchFilters>) => void;

  reset: () => void;
}

const defaultFilters: TripSearchFilters = {
  originCityId: null,
  destinationCityId: null,
  date: "",

  page: 1,
  limit: 10,

  timeSlots: [],
  vehicleTypes: [],
  seatPositions: [],
  floors: [],

  sort: {
    field: "price",
    order: "asc",
  },

  onlyAvailable: false,
};

export const useTripFilterStore = create<TripFilterStore>()(
  persist(
    (set) => ({
      filters: defaultFilters,

      setFilters: (filters) =>
        set((state) => ({
          filters: {
            ...state.filters,
            ...filters,
          },
        })),

      reset: () =>
        set({
          filters: defaultFilters,
        }),
    }),

    {
      name: "trip-filter-storage",

      storage: createJSONStorage(() => localStorage),
    },
  ),
);
