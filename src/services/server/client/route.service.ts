import { PopularRoute } from "@/types/client/route/route.type";
import { City, Zone, PickupPoint } from "@/types/client/route/route.type";

import {
  CitySearchItem,
  ZoneSearchItem,
  SearchLocationResponse,
  PickupPointItem,
} from "@/types/client/route/location-search.type";

import {
  findPopularRoutes,
  findZonesByCityId,
  findOfficePickupPoints,
  findCities,
  findPickupPointByLabel,
  searchCities,
  searchPickupPoints,
  searchZones,
  
} from "@/repositories/client/route.repo";

export async function getCities(): Promise<City[]> {
  return await findCities();
}

export async function getZonesByCityId(cityId: number): Promise<Zone[]> {
  return await findZonesByCityId(cityId);
}

export async function getOfficePickupPoints(
  cityId: number,
  zoneId: number,
): Promise<PickupPoint[]> {
  return await findOfficePickupPoints(cityId, zoneId);
}

export async function getPopularRoutes(): Promise<PopularRoute[]> {
  return await findPopularRoutes();
}

export async function searchLocations(
  keyword: string,
): Promise<SearchLocationResponse> {
  const [cities, zones, pickupPoints] = await Promise.all([
    searchCities(keyword),
    searchZones(keyword),
    searchPickupPoints(keyword),
  ]);

  const cityMap = new Map<number, CitySearchItem>();

  // =========================
  // HELPER
  // =========================

  const ensureCity = (cityId: number, cityName: string) => {
    if (!cityMap.has(cityId)) {
      cityMap.set(cityId, {
        city_id: cityId,

        city_name: cityName,

        zones: [],

        directPickupPoints: [],
      });
    }

    return cityMap.get(cityId)!;
  };

  // =========================
  // CITY MATCH
  // =========================

  for (const city of cities) {
    ensureCity(city.city_id, city.city_name);
  }

  // =========================
  // ZONE MATCH
  // =========================

  for (const zone of zones) {
    const city = ensureCity(zone.city_id, zone.city_name);

    // tránh duplicate zone
    const existedZone = city.zones.find((z) => z.zone_id === zone.zone_id);

    if (!existedZone) {
      city.zones.push({
        zone_id: zone.zone_id,

        zone_name: zone.zone_name,

        pickupPointCount: 0,

        pickupPoints: [],
      });
    }
  }

  // =========================
  // PICKUP POINT MATCH
  // =========================

  for (const point of pickupPoints) {
    const city = ensureCity(point.city_id, point.city_name);

    const pickupItem: PickupPointItem = {
      pickup_point_id: point.pickup_point_id,

      point_name: point.point_name,

      address: point.address,

      zone_id: point.zone_id,
    };

    // =====================
    // HAS ZONE
    // =====================

    if (point.zone_id) {
      let zone = city.zones.find((z) => z.zone_id === point.zone_id);

      // create zone ONLY if pickup match
      if (!zone) {
        zone = {
          zone_id: point.zone_id,

          zone_name: point.zone_name || "Khu vực",

          pickupPointCount: 0,

          pickupPoints: [],
        };

        city.zones.push(zone);
      }

      // avoid duplicate office
      const existedPickup = zone.pickupPoints.find(
        (p) => p.pickup_point_id === point.pickup_point_id,
      );

      if (!existedPickup) {
        zone.pickupPoints.push(pickupItem);

        zone.pickupPointCount = zone.pickupPoints.length;
      }
    }

    // =====================
    // NO ZONE
    // =====================
    else {
      const existedPickup = city.directPickupPoints.find(
        (p) => p.pickup_point_id === point.pickup_point_id,
      );

      if (!existedPickup) {
        city.directPickupPoints.push(pickupItem);
      }
    }
  }

  return Array.from(cityMap.values());
}

export async function getPickupPointMatch(
  label: string,
  cityId: number,
) {
  const point =
    await findPickupPointByLabel(
      label,
      cityId,
    );

  return {
    pickupPointId:
      point?.pickupPointId ?? null,
  };
}