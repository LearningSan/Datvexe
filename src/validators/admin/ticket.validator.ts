import { z } from "zod";

const num = z.coerce.number().int().positive();
const bool = z.preprocess((v) => v === "true" || v === true, z.boolean());

export const adminTicketListQuerySchema = z.object({
  keyword: z.string().optional().default(""),
  bookingCode: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  routeId: z.coerce.number().int().positive().optional(),
  tripId: z.coerce.number().int().positive().optional(),
  departureDate: z.string().optional(),
  bookingStatus: z
    .enum(["PENDING", "CONFIRMED", "CANCELLED", "REFUNDED"])
    .optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
  holdStatus: z.enum(["NONE", "HOLDING", "EXPIRED"]).optional(),
  onlyHolding: bool.optional(),
  onlyNeedAction: bool.optional(),
  warning: z
    .enum([
      "HOLD_EXPIRING_SOON",
      "HOLD_EXPIRED_NOT_CANCELLED",
      "CONFIRMED_MISSING_SEAT",
      "DUPLICATED_SEAT",
      "CANCELLED_SEAT_NOT_RELEASED",
      "REFUNDED_STATUS_NOT_UPDATED",
      "DEPARTING_SOON_NOT_CHECKED_IN",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "REFUNDED"]),
  reason: z.string().trim().optional(),
  markPaymentPaid: z.boolean().optional(),
});

export const cancelTicketSchema = z.object({
  reason: z.string().trim().min(3, "Vui lòng nhập lý do hủy vé"),
  refundRequired: z.boolean().optional().default(false),
  notifyCustomer: z.boolean().optional().default(true),
});

export const extendTicketHoldSchema = z.object({
  minutes: z.coerce.number().int().min(1).max(120),
});

export const addTicketSeatsSchema = z.object({
  seatLayoutDetailIds: z.array(num).min(1),
});

export const changeTicketSeatsSchema = z.object({
  oldBookingSeatIds: z.array(num).min(1),
  newSeatLayoutDetailIds: z.array(num).min(1),
});

export const pickupDropoffSchema = z.object({
  pickupPointId: z.coerce.number().int().positive().nullable().optional(),
  dropoffPointId: z.coerce.number().int().positive().nullable().optional(),
});

export const createOfflineTicketSchema = z.object({
  tripId: num,
  passengerName: z.string().trim().min(2),
  passengerPhone: z.string().trim().min(9),
  passengerEmail: z.string().email().nullable().optional(),
  pickupPointId: z.coerce.number().int().positive().nullable().optional(),
  dropoffPointId: z.coerce.number().int().positive().nullable().optional(),
  seatLayoutDetailIds: z.array(num).min(1),
  paid: z.boolean().default(true),
});

export const changeTicketPreviewSchema = z.object({
  newTripId: z.coerce.number().int().positive().optional(),
  newSeatLayoutDetailIds: z.preprocess((value) => {
    if (typeof value === "string") {
      return value
        .split(",")
        .map((x) => Number(x.trim()))
        .filter(Boolean);
    }
    return value;
  }, z.array(num).optional()),
  pickupPointId: z.coerce.number().int().positive().nullable().optional(),
  dropoffPointId: z.coerce.number().int().positive().nullable().optional(),
});

export const changeTicketTripSchema = z.object({
  newTripId: num,
  oldBookingSeatIds: z.array(num).min(1, "Chưa chọn ghế cũ cần thu hồi"),
  newSeatLayoutDetailIds: z.array(num).min(1, "Chưa chọn ghế mới"),
  pickupPointId: z.coerce.number().int().positive().nullable().optional(),
  dropoffPointId: z.coerce.number().int().positive().nullable().optional(),
  reason: z.string().trim().min(3, "Vui lòng nhập lý do đổi vé"),
});
