import pool from "@/db/db";
import { query, connQuery } from "@/lib/server/mysql";
import mysql from "mysql2/promise";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { SearchTripsRepoInput } from "@/types/client/trip/trip-repo.type";

export const searchTripsRepo = async (query: SearchTripsRepoInput) => {
  const {
    origin,
    destination,
    date,
    page = 1,
    limit = 10,
    timeSlots = [],
    vehicleTypes = [],
    seatPositions = [],
    floors = [],
    sort,
    onlyAvailable = false,
  } = query;

  const safePage = Number(page);
  const safeLimit = Number(limit);

  const offset = (safePage - 1) * safeLimit;

  const startDate = `${date} 00:00:00`;
  const endDate = `${date} 23:59:59`;

  const params: any[] = [];

  let whereSql = `
    WHERE
      r.origin_city_id = ?
      AND r.destination_city_id = ?
      AND t.departure_datetime BETWEEN ? AND ?
      AND t.status = 'OPEN'
  `;

  params.push(origin, destination, startDate, endDate);

  if (onlyAvailable) {
    whereSql += `
      AND t.available_seats > 0
    `;
  }

  if (timeSlots.length > 0) {
    const conditions: string[] = [];

    for (const slot of timeSlots) {
      const [start, end] = slot.split("-");

      const startTime = `${start}:00`;
      const endTime = end === "24:00" ? "23:59:59" : `${end}:00`;

      conditions.push(`
        TIME(t.departure_datetime)
        BETWEEN ? AND ?
      `);

      params.push(startTime, endTime);
    }

    whereSql += `
      AND (${conditions.join(" OR ")})
    `;
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

  if (floors.length > 0) {
    const floorValues = floors
      .map((f) => floorMap[f])
      .filter((v) => v !== undefined);

    if (floorValues.length > 0) {
      whereSql += `
        AND EXISTS (
          SELECT 1
          FROM seat_layout_details sld
          WHERE sld.seat_layout_id = sl.seat_layout_id
            AND sld.floor_no IN (
              ${floorValues.map(() => "?").join(",")}
            )
        )
      `;

      params.push(...floorValues);
    }
  }

  const seatMap: Record<string, "front" | "middle" | "back"> = {
    "Hàng đầu": "front",
    "Hàng giữa": "middle",
    "Hàng cuối": "back",
  };

  if (seatPositions.length > 0) {
    const seatConditions: string[] = [];

    for (const pos of seatPositions) {
      const mapped = seatMap[pos];

      if (!mapped) continue;

      if (mapped === "front") {
        seatConditions.push(`
          EXISTS (
            SELECT 1
            FROM seat_layout_details sld
            WHERE sld.seat_layout_id = sl.seat_layout_id
              AND sld.row_no <= 2
          )
        `);
      }

      if (mapped === "middle") {
        seatConditions.push(`
          EXISTS (
            SELECT 1
            FROM seat_layout_details sld
            WHERE sld.seat_layout_id = sl.seat_layout_id
              AND sld.row_no BETWEEN 3 AND 5
          )
        `);
      }

      if (mapped === "back") {
        seatConditions.push(`
          EXISTS (
            SELECT 1
            FROM seat_layout_details sld
            WHERE sld.seat_layout_id = sl.seat_layout_id
              AND sld.row_no >= 6
          )
        `);
      }
    }

    if (seatConditions.length > 0) {
      whereSql += `
        AND (${seatConditions.join(" OR ")})
      `;
    }
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
        FROM pickup_points pp
        WHERE pp.zone_id = r.origin_hub_id
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

  const [rows]: any = await pool.execute(sql, params);

  // =========================
  // COUNT QUERY
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

    ${whereSql}
  `;

  const [countRows]: any = await pool.execute(countSql, params);

  return {
    trips: rows,

    total: countRows[0].total,

    page: safePage,
    limit: safeLimit,
  };
};
export async function findTripById(conn: mysql.PoolConnection, tripId: number) {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `
      SELECT *
      FROM trips
      WHERE trip_id = ?
    `,
    [tripId],
  );

  return rows[0];
}
export async function getTripFilterOptionsRepo(input: {
  origin: number;
  destination: number;
  date: string;
}) {
  const startDate = `${input.date} 00:00:00`;
  const endDate = `${input.date} 23:59:59`;

  const sql = `
    SELECT DISTINCT
      HOUR(t.departure_datetime) AS departureHour
    FROM trips t
    INNER JOIN routes r ON r.route_id = t.route_id
    WHERE r.origin_city_id = ?
      AND r.destination_city_id = ?
      AND t.departure_datetime BETWEEN ? AND ?
      AND t.status = 'OPEN'
    ORDER BY departureHour ASC
  `;

  const [rows]: any = await pool.execute(sql, [
    input.origin,
    input.destination,
    startDate,
    endDate,
  ]);

  const timeSlots = rows.map((row: any) => {
    const hour = Number(row.departureHour);
    const nextHour = hour + 1;

    return {
      label: `${String(hour).padStart(2, "0")}:00 - ${String(nextHour).padStart(2, "0")}:00`,
      value: `${String(hour).padStart(2, "0")}:00-${String(nextHour).padStart(2, "0")}:00`,
    };
  });

  return {
    timeSlots,
  };
}