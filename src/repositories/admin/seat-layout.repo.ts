import { query } from "@/lib/server/mysql";

function buildWarnings(row: any) {
  const warnings: string[] = [];

  if (Number(row.actualSeats) === 0) warnings.push("Thiếu ghế");
  if (Number(row.actualSeats) !== Number(row.totalSeats)) {
    warnings.push("Số ghế không khớp");
  }
  if (Number(row.duplicateSeatCodeCount) > 0) warnings.push("Trùng mã ghế");
  if (Number(row.duplicatePositionCount) > 0) warnings.push("Trùng vị trí");
  if (Number(row.vehicleCount) > 0) warnings.push("Đang được xe sử dụng");

  return warnings;
}

export async function findSeatLayouts() {
  const rows = await query<any>(`
    SELECT
      sl.seat_layout_id AS seatLayoutId,
      sl.vehicle_type_id AS vehicleTypeId,
      vt.type_name AS vehicleTypeName,
      sl.layout_code AS layoutCode,
      sl.layout_name AS layoutName,
      sl.total_seats AS totalSeats,
      sl.floor_count AS floorCount,
      sl.is_active AS isActive,

      COUNT(DISTINCT sld.seat_layout_detail_id) AS actualSeats,
      COUNT(DISTINCT v.vehicle_id) AS vehicleCount,
      COUNT(DISTINCT bs.booking_seat_id) AS bookingSeatCount,

      (
        SELECT COUNT(*)
        FROM (
          SELECT seat_number
          FROM seat_layout_details
          WHERE seat_layout_id = sl.seat_layout_id
          GROUP BY seat_number
          HAVING COUNT(*) > 1
        ) x
      ) AS duplicateSeatCodeCount,

      (
        SELECT COUNT(*)
        FROM (
          SELECT floor_no, row_no, column_no
          FROM seat_layout_details
          WHERE seat_layout_id = sl.seat_layout_id
          GROUP BY floor_no, row_no, column_no
          HAVING COUNT(*) > 1
        ) y
      ) AS duplicatePositionCount

    FROM seat_layouts sl
    INNER JOIN vehicle_types vt ON vt.vehicle_type_id = sl.vehicle_type_id
    LEFT JOIN seat_layout_details sld ON sld.seat_layout_id = sl.seat_layout_id
    LEFT JOIN vehicles v ON v.seat_layout_id = sl.seat_layout_id
    LEFT JOIN booking_seats bs ON bs.seat_layout_detail_id = sld.seat_layout_detail_id
    GROUP BY
      sl.seat_layout_id,
      sl.vehicle_type_id,
      vt.type_name,
      sl.layout_code,
      sl.layout_name,
      sl.total_seats,
      sl.floor_count,
      sl.is_active
    ORDER BY sl.created_at DESC
  `);

  return rows.map((row: any) => ({
    ...row,
    isLocked: Number(row.vehicleCount) > 0 || Number(row.bookingSeatCount) > 0,
    warnings: buildWarnings(row),
  }));
}

export async function findSeatLayoutDetail(seatLayoutId: number) {
  const layouts = await findSeatLayouts();
  const layout = layouts.find(
    (item: any) => Number(item.seatLayoutId) === seatLayoutId,
  );

  if (!layout) return null;

  const details = await query<any>(
    `
    SELECT
      seat_layout_detail_id AS seatLayoutDetailId,
      seat_number AS seatNumber,
      seat_type AS seatType,
      floor_no AS floorNo,
      row_no AS rowNo,
      column_no AS columnNo,
      is_active AS isActive
    FROM seat_layout_details
    WHERE seat_layout_id = ?
    ORDER BY floor_no ASC, row_no ASC, column_no ASC
    `,
    [seatLayoutId],
  );

  const vehicles = await query<any>(
    `
    SELECT
      vehicle_id AS vehicleId,
      internal_code AS internalCode,
      license_plate AS licensePlate,
      vehicle_name AS vehicleName,
      status
    FROM vehicles
    WHERE seat_layout_id = ?
    ORDER BY license_plate ASC
    `,
    [seatLayoutId],
  );

  return { layout, details, vehicles };
}

export async function updateSeatLayoutStatusRepo(
  seatLayoutId: number,
  isActive: boolean,
) {
  await query(
    `
    UPDATE seat_layouts
    SET is_active = ?
    WHERE seat_layout_id = ?
    `,
    [isActive, seatLayoutId],
  );

  return { seatLayoutId, isActive };
}

export async function duplicateSeatLayoutRepo(
  seatLayoutId: number,
  payload: { layoutCode: string; layoutName: string },
) {
  const oldLayout = await query<any>(
    `
    SELECT *
    FROM seat_layouts
    WHERE seat_layout_id = ?
    LIMIT 1
    `,
    [seatLayoutId],
  );

  if (!oldLayout[0]) {
    throw new Error("Không tìm thấy sơ đồ ghế");
  }

  const result: any = await query(
    `
    INSERT INTO seat_layouts (
      vehicle_type_id,
      layout_code,
      layout_name,
      total_seats,
      floor_count,
      is_active
    )
    VALUES (?, ?, ?, ?, ?, TRUE)
    `,
    [
      oldLayout[0].vehicle_type_id,
      payload.layoutCode,
      payload.layoutName,
      oldLayout[0].total_seats,
      oldLayout[0].floor_count,
    ],
  );

  const newSeatLayoutId = result.insertId;

  await query(
    `
    INSERT INTO seat_layout_details (
      seat_layout_id,
      seat_number,
      seat_type,
      floor_no,
      row_no,
      column_no,
      is_active
    )
    SELECT
      ?,
      seat_number,
      seat_type,
      floor_no,
      row_no,
      column_no,
      is_active
    FROM seat_layout_details
    WHERE seat_layout_id = ?
    `,
    [newSeatLayoutId, seatLayoutId],
  );

  return { seatLayoutId: newSeatLayoutId };
}
