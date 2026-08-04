import crypto from "crypto";

export interface CheckinQrBooking {
  bookingId: number;
  bookingCode: string;
}

export interface CheckinQrPayload {
  type: "CHECKIN";
  version: 1;

  bookings: CheckinQrBooking[];

  issuedAt: number;
  signature: string;
}
type UnsignedCheckinQrPayload = Omit<CheckinQrPayload, "signature">;

function getCheckinQrSecret(): string {
  const secret = process.env.CHECKIN_QR_SECRET;

  if (!secret) {
    throw new Error("Thiếu biến môi trường CHECKIN_QR_SECRET");
  }

  return secret;
}

function createSignature(payload: UnsignedCheckinQrPayload): string {
  const rawData = [
    payload.type,
    payload.version,
    JSON.stringify(payload.bookings),
    payload.issuedAt,
  ].join("|");

  return crypto
    .createHmac("sha256", getCheckinQrSecret())
    .update(rawData)
    .digest("hex");
}

  export function createCheckinQrPayload(input: {
    bookings: CheckinQrBooking[];
  }): CheckinQrPayload {
    if (!Array.isArray(input.bookings) || input.bookings.length === 0) {
      throw new Error("Danh sách booking tạo QR check-in không hợp lệ");
    }

    const bookings = input.bookings.map((booking) => {
      if (!Number.isInteger(booking.bookingId) || booking.bookingId <= 0) {
        throw new Error("bookingId tạo QR check-in không hợp lệ");
      }

      const bookingCode = booking.bookingCode.trim();

      if (!bookingCode) {
        throw new Error("bookingCode tạo QR check-in không hợp lệ");
      }

      return {
        bookingId: booking.bookingId,
        bookingCode,
      };
    });

    const unsignedPayload = {
      type: "CHECKIN" as const,
      version: 1 as const,

      bookings,

      issuedAt: Date.now(),
    };

    return {
      ...unsignedPayload,
      signature: createSignature(unsignedPayload),
    };
  }

export function encodeCheckinQrPayload(input: {
  bookings: CheckinQrBooking[];
}): string {
  return JSON.stringify(createCheckinQrPayload(input));
}

export function verifyCheckinQrPayload(input: unknown): CheckinQrPayload {
  if (typeof input !== "object" || input === null) {
    throw new Error("Dữ liệu QR check-in không hợp lệ");
  }

  const value = input as Record<string, unknown>;

  if (value.type !== "CHECKIN" || value.version !== 1) {
    throw new Error("QR không phải mã check-in của XeKhachPT");
  }

  if (!Array.isArray(value.bookings)) {
    throw new Error("QR không có danh sách booking");
  }

  const bookings = value.bookings.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("Thông tin booking trong QR không hợp lệ");
    }

    const booking = item as Record<string, unknown>;

    const bookingId = Number(booking.bookingId);

    const bookingCode =
      typeof booking.bookingCode === "string" ? booking.bookingCode.trim() : "";

    if (!Number.isInteger(bookingId) || bookingId <= 0 || !bookingCode) {
      throw new Error("Thông tin booking trong QR không hợp lệ");
    }

    return {
      bookingId,
      bookingCode,
    };
  });

  const issuedAt = Number(value.issuedAt);

  const signature =
    typeof value.signature === "string" ? value.signature.trim() : "";

  if (
    bookings.length === 0 ||
    !Number.isFinite(issuedAt) ||
    issuedAt <= 0 ||
    !signature
  ) {
    throw new Error("QR check-in thiếu thông tin");
  }

  const unsignedPayload: UnsignedCheckinQrPayload = {
    type: "CHECKIN",
    version: 1,
    bookings,
    issuedAt,
  };

  const expectedSignature = createSignature(unsignedPayload);

  const receivedBuffer = Buffer.from(signature, "utf8");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new Error("Chữ ký QR check-in không hợp lệ");
  }

  return {
    ...unsignedPayload,
    signature,
  };
}

export function parseAndVerifyCheckinQr(rawValue: string): CheckinQrPayload {
  if (!rawValue.trim()) {
    throw new Error("Mã QR check-in trống");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new Error("Nội dung QR check-in không đúng định dạng");
  }

  return verifyCheckinQrPayload(parsed);
}
