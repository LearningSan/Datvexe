"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchCities,
  searchLocations,
  fetchOfficePickupPoints,
  fetchPickupPointMatch,
  fetchPickupPoints,
  fetchPopularRoutes,
  fetchZones,
} from "@/services/client/route.service";

import { useDebounce } from "./useDebounce";

export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: fetchCities,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useLocationSearch(keyword: string) {
  const debouncedKeyword = useDebounce(keyword, 300);

  return useQuery({
    queryKey: ["location-search", debouncedKeyword],
    queryFn: () => searchLocations(debouncedKeyword),
    enabled: debouncedKeyword.trim().length >= 2,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useOfficePickupPoints(cityId?: number, zoneIds: number[] = []) {
  return useQuery({
    queryKey: ["office-pickup-points", cityId, zoneIds],

    queryFn: async () => {
      if (!cityId || zoneIds.length === 0) return [];

      const results = await Promise.all(
        zoneIds.map((zoneId) => fetchOfficePickupPoints(cityId, zoneId)),
      );

      return results.flat();
    },

    enabled: !!cityId && zoneIds.length > 0,
  });
}

export function usePickupPointMatch(label?: string, cityId?: number) {
  return useQuery({
    queryKey: ["pickup-point-match", label, cityId],
    queryFn: () => fetchPickupPointMatch(label!, cityId!),
    enabled: !!label && !!cityId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function usePickupPoints(cityId: number | null, zoneId: number | null) {
  return useQuery({
    queryKey: ["pickup-points", cityId, zoneId],
    queryFn: () => fetchPickupPoints(cityId!, zoneId!),
    enabled: !!cityId && !!zoneId,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function usePopularRoutes() {
  return useQuery({
    queryKey: ["popular-routes"],
    queryFn: fetchPopularRoutes,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useZones(cityId?: number) {
  return useQuery({
    queryKey: ["zones", cityId],
    queryFn: () => fetchZones(cityId as number),
    enabled: cityId !== undefined,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
