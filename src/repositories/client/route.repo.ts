import { query } from "@/lib/server/mysql";

import {
  PopularRoute,
  City,
  Zone,
  PickupPoint,
} from "@/types/client/route/route.type";
import {
  SearchCityRow,
  SearchZoneRow,
  SearchPickupPointRow,
} from "@/types/client/route/location-search.type";
export async function findCities(): Promise<City[]> {
  const sql = `
        SELECT city_id, city_name
        FROM cities
        ORDER BY city_name ASC
    `;

  return await query<City>(sql);
}

export async function findZonesByCityId(cityId: number): Promise<Zone[]> {
  const sql = `
        SELECT zone_id, zone_name, zone_type
        FROM zones
        WHERE city_id = ?
        ORDER BY zone_name ASC
    `;

  return await query<Zone>(sql, [cityId]);
}
export async function findOfficePickupPoints(
  cityId: number,
  zoneId: number,
): Promise<PickupPoint[]> {
  const sql = `
        SELECT
            pickup_point_id,
            point_name,
            address,
            latitude,
            longitude
        FROM pickup_points
        WHERE city_id = ?
          AND zone_id = ?
          AND point_category in ('OFFICE','SHUTTLE_AREA')
          AND is_active = 1
        ORDER BY point_name ASC
    `;

  return await query<PickupPoint>(sql, [cityId, zoneId]);
}
export async function findPopularRoutes(): Promise<PopularRoute[]> {
  const sql = `
    SELECT
      r.route_id,
      oc.city_name AS origin_city,
      dc.city_name AS destination_city,
      dc.image_url AS destination_image_url,
      r.distance_km,
      r.estimated_duration,
      MIN(st.base_price) AS base_price
    FROM routes r
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    INNER JOIN schedule_templates st ON st.route_id = r.route_id
    WHERE r.status = 'ACTIVE'
      AND st.is_active = TRUE
    GROUP BY
      r.route_id,
      oc.city_name,
      dc.city_name,
      dc.image_url,
      r.distance_km,
      r.estimated_duration
    ORDER BY base_price ASC
    LIMIT 12
  `;

  return await query<PopularRoute>(sql);
}

export async function searchCities(keyword: string): Promise<SearchCityRow[]> {
  const sql = `
    SELECT
      city_id,
      city_name
    FROM cities
    WHERE city_name COLLATE utf8mb4_bin LIKE ?
    LIMIT 10
  `;

  return await query<SearchCityRow>(sql, [`%${keyword}%`]);
}
export async function searchZones(keyword: string): Promise<SearchZoneRow[]> {
  const sql = `
    SELECT
      z.zone_id,
      z.zone_name,
      z.city_id,
      c.city_name
    FROM zones z
    INNER JOIN cities c ON c.city_id = z.city_id
    WHERE z.zone_name COLLATE utf8mb4_bin LIKE ?
    LIMIT 20
  `;

  return await query<SearchZoneRow>(sql, [`%${keyword}%`]);
}

export async function searchPickupPoints(
  keyword: string,
): Promise<SearchPickupPointRow[]> {
  const sql = `
    SELECT
      pp.pickup_point_id,
      pp.point_name,
      pp.address,
      pp.city_id,
      pp.zone_id,
      z.zone_name,
      c.city_name
    FROM pickup_points pp
    LEFT JOIN zones z ON z.zone_id = pp.zone_id
    INNER JOIN cities c ON c.city_id = pp.city_id
    WHERE
      pp.point_name COLLATE utf8mb4_bin LIKE ?
      OR pp.address COLLATE utf8mb4_bin LIKE ?
    LIMIT 30
  `;

  return await query<SearchPickupPointRow>(sql, [
    `%${keyword}%`,
    `%${keyword}%`,
  ]);
}

// =========================
// FIND PICKUP POINT BY LABEL
// =========================
export async function findPickupPointByLabel(label: string, cityId: number) {
  const sql = `
    SELECT
      pickup_point_id AS pickupPointId
    FROM pickup_points
    WHERE
      city_id = ?
      AND point_name = ?
      AND is_active = TRUE
    LIMIT 1
  `;

  const result = await query<{
    pickupPointId: number;
  }>(sql, [cityId, label]);

  return result[0] || null;
}
