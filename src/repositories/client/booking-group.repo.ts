import {
  connExecute,
  connQuery,
  query,
  type PoolConnection,
} from "@/lib/server/mysql";
export interface CreateBookingGroupInput {
  userId: number | null;

  tripType: "ONE_WAY" | "ROUND_TRIP";

  contactName: string;
  contactPhone: string;
  contactEmail: string | null;

  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;

  bookingGroupCode: string;
}
export async function createBookingGroup(
  conn: PoolConnection,
  payload: CreateBookingGroupInput,
) {
  const result = await connExecute(
    conn,
    `
        INSERT INTO booking_groups
        (
            booking_group_code,
            user_id,
            trip_type,
            status,
            subtotal_amount,
            discount_amount,
            total_amount,
            contact_name,
            contact_phone,
            contact_email
        )
        VALUES
        (
            ?, ?, ?, 'PENDING',
            ?, ?, ?,
            ?, ?, ?
        )
        `,
    [
      payload.bookingGroupCode,
      payload.userId,
      payload.tripType,

      payload.subtotalAmount,
      payload.discountAmount,
      payload.totalAmount,

      payload.contactName,
      payload.contactPhone,
      payload.contactEmail,
    ],
  );

  return result.insertId;
}
export async function insertBookingGroupItem(
    conn: PoolConnection,
    bookingGroupId: number,
    bookingId: number,
    tripOrder: number,
) {
    await connQuery(
        conn,
        `
        INSERT INTO booking_group_items
        (
            booking_group_id,
            booking_id,
            trip_order
        )
        VALUES
        (
            ?, ?, ?
        )
        `,
        [
            bookingGroupId,
            bookingId,
            tripOrder,
        ],
    );
}
