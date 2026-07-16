import api from "@/lib/client/api";

import {
  CityResponse,
  ZoneResponse,
  PickupPointResponse,
  PopularRouteResponse,
} from "@/types/client/route/route-response.type";
import { SearchLocationResponse } from "@/types/client/route/location-search.type";
import { ApiResponse } from "@/types/common/api.type";
import { PickupPointMatchResponse } from "@/types/client/route/route-response.type";
import type {
  ScheduleRouteQuery,
  ScheduleRouteResponse,
} from "@/types/client/route/schedule-route.type";

export async function fetchCities() {
  const res = await api.get<ApiResponse<CityResponse>>("/client/routes/cities");
  return res.data.data;
}

export async function fetchZones(cityId: number) {
  const res = await api.get<ApiResponse<ZoneResponse>>(
    `/client/routes/zones?cityId=${cityId}`,
  );
  return res.data.data;
}

export async function fetchPickupPoints(cityId: number, zoneId: number) {
  const res = await api.get<ApiResponse<PickupPointResponse>>(
    `/client/routes/pickup-points?cityId=${cityId}&zoneId=${zoneId}`,
  );

  return res.data.data;
}

export async function fetchPopularRoutes() {
  const res = await api.get<ApiResponse<PopularRouteResponse>>(
    "/client/routes/popular",
  );

  return res.data.data;
}
export async function searchLocations(keyword: string) {
  const res = await api.get<ApiResponse<SearchLocationResponse>>(
    `/client/routes/location-search?q=${keyword}`,
  );

  return res.data.data;
}
export async function fetchOfficePickupPoints(cityId: number, zoneId: number) {
  const res = await api.get<ApiResponse<PickupPointResponse>>(
    `/client/routes/pickup-points?cityId=${cityId}&zoneId=${zoneId}`,
  );

  return res.data.data;
}
export async function fetchPickupPointMatch(label: string, cityId: number) {
  const response = await api.get<ApiResponse<PickupPointMatchResponse>>(
    `/client/routes/pickup-point-match?label=${encodeURIComponent(label)}&cityId=${cityId}`,
  );

  return response.data.data;
}
export async function fetchScheduleRoutes(query: ScheduleRouteQuery) {
  const params = new URLSearchParams();

  if (query.originCityId) {
    params.set("originCityId", String(query.originCityId));
  }

  if (query.destinationCityId) {
    params.set("destinationCityId", String(query.destinationCityId));
  }

  query.vehicleTypes?.forEach((vehicleType) => {
    params.append("vehicleTypes", vehicleType);
  });

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  const response = await api.get<ApiResponse<ScheduleRouteResponse>>(
    `/client/routes/schedules?${params.toString()}`,
  );

  return response.data.data;
}
