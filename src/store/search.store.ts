"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { SelectedLocation } from "@/types/client/route/location-search.type";

/* =========================
   TYPES
========================= */

/*
 * Lịch sử tìm kiếm chỉ lưu chiều đi.
 */
export interface RecentSearch {
  origin: SelectedLocation | null;
  destination: SelectedLocation | null;
  departureDate: string;
  ticketCount: number;
}

/*
 * Tìm kiếm hiện tại lưu thêm thông tin khứ hồi.
 */
export interface CurrentSearch extends RecentSearch {
  isRoundTrip: boolean;
  returnDate: string | null;
}

interface SearchStore {
  currentSearch: CurrentSearch | null;
  recentSearches: RecentSearch[];

  setSearch: (payload: CurrentSearch) => void;

  clearCurrentSearch: () => void;
  clearRecentSearches: () => void;

  swapLocation: () => void;
}

/* =========================
   STORE
========================= */

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      currentSearch: null,
      recentSearches: [],

      // ======================
      // SET SEARCH
      // ======================
      setSearch: (payload) => {
        const oldSearches = get().recentSearches;

        /*
         * Recent search chỉ lưu chiều đi.
         */
        const recentItem: RecentSearch = {
          origin: payload.origin,
          destination: payload.destination,
          departureDate: payload.departureDate,
          ticketCount: payload.ticketCount,
        };

        const filtered = oldSearches.filter(
          (item) =>
            !(
              item.origin?.type === recentItem.origin?.type &&
              item.origin?.id === recentItem.origin?.id &&
              item.destination?.type === recentItem.destination?.type &&
              item.destination?.id === recentItem.destination?.id &&
              item.departureDate === recentItem.departureDate
            ),
        );

        set({
          currentSearch: {
            ...payload,

            /*
             * Vé một chiều không lưu ngày về.
             */
            returnDate: payload.isRoundTrip ? payload.returnDate : null,
          },

          recentSearches: [recentItem, ...filtered].slice(0, 3),
        });
      },

      // ======================
      // SWAP LOCATION
      // ======================
      swapLocation: () => {
        const current = get().currentSearch;

        if (!current) return;

        set({
          currentSearch: {
            ...current,
            origin: current.destination,
            destination: current.origin,
          },
        });
      },

      // ======================
      // CLEAR CURRENT
      // ======================
      clearCurrentSearch: () =>
        set({
          currentSearch: null,
        }),

      // ======================
      // CLEAR HISTORY
      // ======================
      clearRecentSearches: () =>
        set({
          recentSearches: [],
        }),
    }),
    {
      name: "search-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
