"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { SelectedLocation } from "@/types/client/route/location-search.type";

export interface RecentSearch {
  origin: SelectedLocation | null;
  destination: SelectedLocation | null;
  departureDate: string;
  ticketCount: number;
}

interface SearchStore {
  currentSearch: RecentSearch | null;
  recentSearches: RecentSearch[];

  setSearch: (payload: RecentSearch) => void;
  clearRecentSearches: () => void;
  swapLocation: () => void;
}

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

        const filtered = oldSearches.filter(
          (item) =>
            !(
              item.origin?.id === payload.origin?.id &&
              item.destination?.id === payload.destination?.id &&
              item.departureDate === payload.departureDate
            ),
        );

        set({
          currentSearch: payload,
          recentSearches: [payload, ...filtered].slice(0, 3),
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
