import crypto from "crypto";

export interface CheckinQrPayload {
  type: "CHECKIN";
  version: 1;

  bookingId: number;
  bookingCode: string;

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
    payload.bookingId,
    payload.bookingCode,
    payload.issuedAt,
  ].join("|");

  return crypto
    .createHmac("sha256", getCheckinQrSecret())
    .update(rawData)
    .digest("hex");
}

export function createCheckinQrPayload(input: {
  bookingId: number;
  bookingCode: string;
}): CheckinQrPayload {
  if (!Number.isInteger(input.bookingId) || input.bookingId <= 0) {
    throw new Error("bookingId tạo QR check-in không hợp lệ");
  }

  const bookingCode = input.bookingCode.trim();

  if (!bookingCode) {
    throw new Error("bookingCode tạo QR check-in không hợp lệ");
  }

  const unsignedPayload: UnsignedCheckinQrPayload = {
    type: "CHECKIN",
    version: 1,
    bookingId: input.bookingId,
    bookingCode,
    issuedAt: Date.now(),
  };

  return {
    ...unsignedPayload,
    signature: createSignature(unsignedPayload),
  };
}

export function encodeCheckinQrPayload(input: {
  bookingId: number;
  bookingCode: string;
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

  const bookingId = Number(value.bookingId);

  const bookingCode =
    typeof value.bookingCode === "string" ? value.bookingCode.trim() : "";

  const issuedAt = Number(value.issuedAt);

  const signature =
    typeof value.signature === "string" ? value.signature.trim() : "";

  if (
    !Number.isInteger(bookingId) ||
    bookingId <= 0 ||
    !bookingCode ||
    !Number.isFinite(issuedAt) ||
    issuedAt <= 0 ||
    !signature
  ) {
    throw new Error("QR check-in thiếu thông tin");
  }

  const unsignedPayload: UnsignedCheckinQrPayload = {
    type: "CHECKIN",
    version: 1,
    bookingId,
    bookingCode,
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
