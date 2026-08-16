import { connQuery, query, type PoolConnection } from "@/lib/server/mysql";

import type { SearchTripsRepoInput } from "@/types/client/trip/trip-repo.type";

export const searchTripsRepo = async (input: SearchTripsRepoInput) => {
  const {
    origin,
    destination,
    date,
    requiredSeats = 1,
    page = 1,
    limit = 10,
    timeSlots = [],
    vehicleTypes = [],
    seatPositions = [],
    floors = [],
    sort,
  } = input;

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const offset = (safePage - 1) * safeLimit;

  const startDate = `${date} 00:00:00`;
  const endDate = `${date} 23:59:59`;

  const params: Array<string | number> = [];
  let whereSql = `
    WHERE
      r.origin_city_id = ?
      AND r.destination_city_id = ?
      AND t.departure_datetime BETWEEN ? AND ?
      AND t.departure_datetime >= NOW()
      AND t.status = 'OPEN'
  `;

  params.push(origin, destination, startDate, endDate);

  const safeRequiredSeats = Math.min(
    Math.max(Number(requiredSeats) || 1, 1),
    5,
  );

  whereSql += `
  AND t.available_seats >= ?
`;

  params.push(safeRequiredSeats);

  const TIME_SLOT_REGEX =
    /^([01]\d|2[0-3]):[0-5]\d-(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/;

  if (timeSlots.length > 0) {
    const conditions: string[] = [];

    for (const slot of timeSlots) {
      if (!TIME_SLOT_REGEX.test(slot)) {
        continue;
      }

      const [start, end] = slot.split("-");

      if (end === "24:00") {
        conditions.push(`
        (
          TIME(t.departure_datetime) >= ?
          AND TIME(t.departure_datetime) <= '23:59:59'
        )
      `);

        params.push(`${start}:00`);
        continue;
      }

      conditions.push(`
      (
        TIME(t.departure_datetime) >= ?
        AND TIME(t.departure_datetime) < ?
      )
    `);

      params.push(`${start}:00`, `${end}:00`);
    }

    if (conditions.length > 0) {
      whereSql += `
      AND (${conditions.join(" OR ")})
    `;
    }
  }

  if (vehicleTypes.length > 0) {
    whereSql += `
      AND vt.type_name IN (
        ${vehicleTypes.map(() => "?").join(",")}
      )
    `;

    params.push(...vehicleTypes);
  }

  const floorMap: Record<string, number> = {
    upper: 2,
    lower: 1,

    "Tầng trên": 2,
    "Tầng dưới": 1,
  };

  const seatPositionMap: Record<
    string,
    {
      minRow?: number;
      maxRow?: number;
    }
  > = {
    front: {
      maxRow: 2,
    },

    middle: {
      minRow: 3,
      maxRow: 5,
    },

    back: {
      minRow: 6,
    },

    "Hàng đầu": {
      maxRow: 2,
    },

    "Hàng giữa": {
      minRow: 3,
      maxRow: 5,
    },

    "Hàng cuối": {
      minRow: 6,
    },
  };

  const selectedFloorValues = [
    ...new Set(
      floors
        .map((floor) => floorMap[floor])
        .filter((value): value is number => value !== undefined),
    ),
  ];

  const selectedSeatRanges = seatPositions
    .map((position) => seatPositionMap[position])
    .filter(
      (
        range,
      ): range is {
        minRow?: number;
        maxRow?: number;
      } => range !== undefined,
    );

  if (selectedFloorValues.length > 0 || selectedSeatRanges.length > 0) {
    const availableSeatConditions: string[] = [
      "sld.seat_layout_id = sl.seat_layout_id",
      "sld.is_active = TRUE",
    ];

    if (selectedFloorValues.length > 0) {
      availableSeatConditions.push(`
      sld.floor_no IN (
        ${selectedFloorValues.map(() => "?").join(",")}
      )
    `);

      params.push(...selectedFloorValues);
    }

    if (selectedSeatRanges.length > 0) {
      const rowRangeConditions: string[] = [];

      for (const range of selectedSeatRanges) {
        const currentRange: string[] = [];

        if (range.minRow !== undefined) {
          currentRange.push("sld.row_no >= ?");
          params.push(range.minRow);
        }

        if (range.maxRow !== undefined) {
          currentRange.push("sld.row_no <= ?");
          params.push(range.maxRow);
        }

        rowRangeConditions.push(`
        (${currentRange.join(" AND ")})
      `);
      }

      availableSeatConditions.push(`
      (${rowRangeConditions.join(" OR ")})
    `);
    }

    whereSql += `
    AND (
      SELECT COUNT(*)
      FROM seat_layout_details sld
      WHERE ${availableSeatConditions.join("\n AND ")}

        AND NOT EXISTS (
          SELECT 1
          FROM booking_seats bs
          WHERE bs.trip_id = t.trip_id
            AND bs.seat_layout_detail_id =
                sld.seat_layout_detail_id
        )

        AND NOT EXISTS (
          SELECT 1
          FROM seat_holds sh
          WHERE sh.trip_id = t.trip_id
            AND sh.seat_layout_detail_id =
                sld.seat_layout_detail_id
            AND sh.expired_at > NOW()
        )
    ) >= ?
  `;

    params.push(safeRequiredSeats);
  }
  let sortField = "price";
  let sortOrder: "asc" | "desc" = "asc";

  if (typeof sort === "string") {
    if (sort === "price_asc") {
      sortField = "price";
      sortOrder = "asc";
    }

    if (sort === "price_desc") {
      sortField = "price";
      sortOrder = "desc";
    }

    if (sort === "departure_asc") {
      sortField = "departure";
      sortOrder = "asc";
    }

    if (sort === "departure_desc") {
      sortField = "departure";
      sortOrder = "desc";
    }
  } else if (sort) {
    sortField = sort.field ?? "price";
    sortOrder = sort.order === "desc" ? "desc" : "asc";
  }

  const orderDir = sortOrder === "desc" ? "DESC" : "ASC";

  const orderMap: Record<string, string> = {
    departure: "t.departure_datetime",
    availableSeats: "t.available_seats",
    price:
      "CAST(COALESCE(t.ticket_price, st.base_price, r.base_price, 0) AS UNSIGNED)",
  };

  const orderBy = `${orderMap[sortField] ?? orderMap.price} ${orderDir}`;

  const sql = `
    SELECT
      t.trip_id,

      oc.city_name AS origin_city,
      dc.city_name AS destination_city,

      oz.zone_name AS origin_hub,
      dz.zone_name AS destination_hub,

      r.distance_km,

      t.departure_datetime,
      t.arrival_datetime,

      DATE_FORMAT(
        t.departure_datetime,
        '%H:%i'
      ) AS departure_time,

      DATE_FORMAT(
        t.arrival_datetime,
        '%H:%i'
      ) AS arrival_time,

      TIMESTAMPDIFF(
        MINUTE,
        t.departure_datetime,
        t.arrival_datetime
      ) AS duration_minutes,

      vt.type_name AS vehicle_type,

      sl.total_seats,
      sl.floor_count,

      v.vehicle_name,
      v.license_plate,
      v.image_url,
      t.available_seats,

COALESCE(t.ticket_price, st.base_price, r.base_price, 0) AS price,
(
  SELECT pp.point_name
  FROM trip_pickup_points tpp
  INNER JOIN pickup_points pp
    ON pp.pickup_point_id = tpp.pickup_point_id
  WHERE tpp.trip_id = t.trip_id
    AND tpp.is_active = TRUE
    AND tpp.stop_type IN ('PICKUP', 'BOTH')
  ORDER BY tpp.stop_order ASC
  LIMIT 1
) AS pickup_point

    FROM trips t

    INNER JOIN routes r
      ON r.route_id = t.route_id

    INNER JOIN cities oc
      ON oc.city_id = r.origin_city_id

    INNER JOIN cities dc
      ON dc.city_id = r.destination_city_id

    LEFT JOIN zones oz
      ON oz.zone_id = r.origin_hub_id

    LEFT JOIN zones dz
      ON dz.zone_id = r.destination_hub_id

    INNER JOIN vehicles v
      ON v.vehicle_id = t.vehicle_id

    INNER JOIN vehicle_types vt
      ON vt.vehicle_type_id = v.vehicle_type_id

    INNER JOIN seat_layouts sl
      ON sl.seat_layout_id = v.seat_layout_id

    INNER JOIN schedule_templates st
      ON st.schedule_template_id = t.schedule_template_id

    ${whereSql}

    ORDER BY ${orderBy}

    LIMIT ${offset}, ${safeLimit}
  `;

  const rows = await query<Record<string, unknown>>(sql, params); // COUNT QUERY
  // =========================
  const countSql = `
  SELECT COUNT(*) AS total

  FROM trips t

  INNER JOIN routes r
    ON r.route_id = t.route_id

  INNER JOIN cities oc
    ON oc.city_id = r.origin_city_id

  INNER JOIN cities dc
    ON dc.city_id = r.destination_city_id

  LEFT JOIN zones oz
    ON oz.zone_id = r.origin_hub_id

  LEFT JOIN zones dz
    ON dz.zone_id = r.destination_hub_id

  INNER JOIN vehicles v
    ON v.vehicle_id = t.vehicle_id

  INNER JOIN vehicle_types vt
    ON vt.vehicle_type_id = v.vehicle_type_id

  INNER JOIN seat_layouts sl
    ON sl.seat_layout_id = v.seat_layout_id

  INNER JOIN schedule_templates st
    ON st.schedule_template_id = t.schedule_template_id

  ${whereSql}
`;
  const countRows = await query<{
    total: string | number;
  }>(countSql, params);
  return {
    trips: rows,
    total: Number(countRows[0]?.total ?? 0),
    page: safePage,
    limit: safeLimit,
  };
};
export async function findTripById(conn: PoolConnection, tripId: number) {
  const rows = await connQuery<Record<string, unknown>>(
    conn,
    `
      SELECT *
      FROM trips
      WHERE trip_id = ?
      LIMIT 1
    `,
    [tripId],
  );

  return rows[0] ?? null;
}
export async function getTripFilterOptionsRepo(input: {
  origin: number;
  destination: number;
  date: string;
  requiredSeats?: number;
}) {
  const startDate = `${input.date} 00:00:00`;
  const endDate = `${input.date} 23:59:59`;

  const safeRequiredSeats = Math.min(
    Math.max(Number(input.requiredSeats) || 1, 1),
    5,
  );

  const sql = `
    SELECT
      HOUR(t.departure_datetime) AS departureHour,
      COUNT(*) AS tripCount
    FROM trips t

    INNER JOIN routes r
      ON r.route_id = t.route_id

    WHERE r.origin_city_id = ?
      AND r.destination_city_id = ?
      AND t.departure_datetime BETWEEN ? AND ?
      AND t.departure_datetime >= NOW()
      AND t.status = 'OPEN'
      AND t.available_seats >= ?

    GROUP BY HOUR(t.departure_datetime)

    ORDER BY departureHour ASC
  `;

  const rows = await query<{
    departureHour: string | number;
    tripCount: string | number;
  }>(sql, [
    input.origin,
    input.destination,
    startDate,
    endDate,
    safeRequiredSeats,
  ]);

  const timeSlots = rows.map((row) => {
    const hour = Number(row.departureHour);
    const nextHour = hour + 1;

    const start = `${String(hour).padStart(2, "0")}:00`;

    const end =
      nextHour === 24 ? "24:00" : `${String(nextHour).padStart(2, "0")}:00`;

    return {
      label: `${start} - ${end}`,
      value: `${start}-${end}`,
      count: Number(row.tripCount),
    };
  });

  return {
    timeSlots,
  };
}
interface ScheduleRouteRepoInput {
  originCityId?: number;
  destinationCityId?: number;
  vehicleTypes?: string[];
  page?: number;
  limit?: number;
}

export async function getScheduleRoutesRepo(input: ScheduleRouteRepoInput) {
  const {
    originCityId,
    destinationCityId,
    vehicleTypes = [],
    page = 1,
    limit = 10,
  } = input;

  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const offset = (safePage - 1) * safeLimit;

  const params: Array<string | number> = [];

  let whereSql = `
    WHERE r.status = 'ACTIVE'
      AND st.is_active = TRUE
  `;

  if (originCityId) {
    whereSql += `
      AND r.origin_city_id = ?
    `;

    params.push(originCityId);
  }

  if (destinationCityId) {
    whereSql += `
      AND r.destination_city_id = ?
    `;

    params.push(destinationCityId);
  }

  if (vehicleTypes.length > 0) {
    whereSql += `
      AND EXISTS (
        SELECT 1
        FROM trips vehicle_type_trip
        INNER JOIN vehicles vehicle_type_vehicle
          ON vehicle_type_vehicle.vehicle_id =
             vehicle_type_trip.vehicle_id
        INNER JOIN vehicle_types selected_vehicle_type
          ON selected_vehicle_type.vehicle_type_id =
             vehicle_type_vehicle.vehicle_type_id
        WHERE vehicle_type_trip.route_id = r.route_id
          AND selected_vehicle_type.type_name IN (
            ${vehicleTypes.map(() => "?").join(",")}
          )
      )
    `;

    params.push(...vehicleTypes);
  }

  const sql = `
    SELECT
      r.route_id AS routeId,

      r.origin_city_id AS originCityId,
      r.destination_city_id AS destinationCityId,

      origin_city.city_name AS originName,
      destination_city.city_name AS destinationName,

      origin_zone.zone_name AS originHub,
      destination_zone.zone_name AS destinationHub,

      COALESCE(r.distance_km, 0) AS distanceKm,

      COALESCE(
        r.estimated_duration,
        AVG(st.estimated_duration),
        0
      ) AS estimatedDurationMinutes,

      MIN(
        COALESCE(
          future_trip.ticket_price,
          st.base_price,
          r.base_price,
          0
        )
      ) AS minimumPrice,

      MAX(
        COALESCE(
          future_trip.ticket_price,
          st.base_price,
          r.base_price,
          0
        )
      ) AS maximumPrice,

      COUNT(
        DISTINCT future_trip.trip_id
      ) AS tripCount,

      COUNT(
        DISTINCT st.schedule_template_id
      ) AS tripsPerDay,

      DATE_FORMAT(
        MIN(st.departure_time),
        '%H:%i'
      ) AS firstDepartureTime,

      DATE_FORMAT(
        MAX(st.departure_time),
        '%H:%i'
      ) AS lastDepartureTime,
GROUP_CONCAT(
    DISTINCT vehicle.vehicle_name
    ORDER BY vehicle.vehicle_name
    SEPARATOR '||'
) AS vehicleNames,
      GROUP_CONCAT(
        DISTINCT vehicle_type.type_name
        ORDER BY vehicle_type.type_name
        SEPARATOR '||'
      ) AS vehicleTypes

    FROM routes r

    INNER JOIN cities origin_city
      ON origin_city.city_id = r.origin_city_id

    INNER JOIN cities destination_city
      ON destination_city.city_id = r.destination_city_id

    LEFT JOIN zones origin_zone
      ON origin_zone.zone_id = r.origin_hub_id

    LEFT JOIN zones destination_zone
      ON destination_zone.zone_id = r.destination_hub_id

    INNER JOIN schedule_templates st
      ON st.route_id = r.route_id
      AND st.is_active = TRUE

    LEFT JOIN trips future_trip
      ON future_trip.route_id = r.route_id
      AND future_trip.departure_datetime >= NOW()
      AND future_trip.status IN ('OPEN', 'FULL')

    LEFT JOIN vehicles vehicle
      ON vehicle.vehicle_id = future_trip.vehicle_id

    LEFT JOIN vehicle_types vehicle_type
      ON vehicle_type.vehicle_type_id = vehicle.vehicle_type_id

    ${whereSql}

    GROUP BY
      r.route_id,
      r.origin_city_id,
      r.destination_city_id,
      origin_city.city_name,
      destination_city.city_name,
      origin_zone.zone_name,
      destination_zone.zone_name,
      r.distance_km,
      r.estimated_duration

    ORDER BY
      origin_city.city_name ASC,
      destination_city.city_name ASC

    LIMIT ${safeLimit}
    OFFSET ${offset}
  `;

  const countSql = `
    SELECT COUNT(DISTINCT r.route_id) AS total

    FROM routes r

    INNER JOIN schedule_templates st
      ON st.route_id = r.route_id
      AND st.is_active = TRUE

    ${whereSql}
  `;
  const rows = await query<Record<string, unknown>>(sql, params);

  const countRows = await query<{
    total: string | number;
  }>(countSql, params);

  return {
    rows,
    total: Number(countRows[0]?.total ?? 0),
    page: safePage,
    limit: safeLimit,
  };
}
export async function getScheduleVehicleTypesRepo() {
  return query<{
    id: number;
    name: string;
  }>(
    `
      SELECT
        vehicle_type_id AS id,
        type_name AS name
      FROM vehicle_types
      ORDER BY type_name
    `,
  );
}
