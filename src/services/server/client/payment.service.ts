import { nanoid } from "nanoid";
import { withTransaction, type PoolConnection } from "@/lib/server/mysql";
import { formatDateTimeVN } from "@/lib/client/helpers";
import type {
  BookingPaymentSummary,
  CreatePaymentPayload,
  CreatePaymentResponse,
  PaymentStatusResponse,
  PaymentMethodType,
  PaymentFlowType,
  BuiltPaymentData,
  BookingGroupPaymentSummary,
} from "@/types/client/payment/payment.type";

import type { UpdatePaymentMethodInput } from "@/validators/client/payment.validator";

import {
  findBookingPaymentSummaryRaw,
  findBookingForPayment,
  findPendingPaymentByBooking,
  insertPayment,
  findPaymentStatusById,
  updatePendingPaymentForNewAttempt,
  updatePaymentGatewayData,
  markPaymentWaitingConfirm,
  findBookingUserIdForWallet,
  findOrCreateWalletForUpdate,
  deductWalletBalance,
  markPaymentPaidByWallet,
  confirmBookingAfterPayment,
  findSeatHoldsForPaymentConfirm,
  insertBookingSeatsAfterPayment,
  deleteSeatHoldsAfterPayment,
  findPaymentForConfirm,
  insertPaymentBooking,
  insertPaymentBookingIfNotExists,
  validatePaymentBookings,
} from "@/repositories/client/payment.repo";
import { createGatewayPayment } from "@/services/server/client/payment-gateway.service";
import { insertWalletTransaction as insertWalletHistory } from "@/repositories/client/wallet.repo";
import { sendPaymentResultSideEffects } from "@/services/server/client/payment-webhook.service";
import {
  createDemoPaymentSession,
  isDemoPaymentEnabled,
  isDemoPaymentProvider,
} from "@/services/server/client/demo-payment.service";
function getPaymentHost() {
  return process.env.NEXT_PUBLIC_PAYMENT_HOST || "http://localhost:3000";
}

function buildQrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    data,
  )}`;
}
function isGatewayMethod(method: PaymentMethodType) {
  return (
    method === "PAYOS" ||
    method === "VNPAY" ||
    method === "MOMO" ||
    method === "ZALOPAY"
  );
}
function getFlowType(method: PaymentMethodType): PaymentFlowType {
  if (
    method === "PAYOS" ||
    method === "VNPAY" ||
    method === "MOMO" ||
    method === "ZALOPAY" ||
    method === "VIETQR"
  ) {
    return "QR";
  }

  if (method === "CASH") {
    return "CASH";
  }

  if (method === "INTERNAL_WALLET") {
    return "INTERNAL";
  }

  return "QR";
}
function buildVietQrData(params: {
  transactionCode: string;
  amount: number;
}): BuiltPaymentData {
  const bankBin = process.env.VIETQR_BANK_BIN;
  const accountNo = process.env.VIETQR_ACCOUNT_NO;
  const accountName = process.env.VIETQR_ACCOUNT_NAME;
  const bankName = process.env.VIETQR_BANK_NAME || "Ngân hàng";
  const template = process.env.VIETQR_TEMPLATE || "compact2";

  if (!bankBin || !accountNo || !accountName) {
    throw new Error(
      "Thiếu VIETQR_BANK_BIN, VIETQR_ACCOUNT_NO hoặc VIETQR_ACCOUNT_NAME",
    );
  }

  const query = new URLSearchParams({
    amount: String(Math.round(params.amount)),
    addInfo: params.transactionCode,
    accountName,
  });

  const qrCodeUrl =
    `https://img.vietqr.io/image/` +
    `${bankBin}-${accountNo}-${template}.png?${query.toString()}`;

  return {
    qrCodeUrl,
    paymentUrl: null,
    deeplink: null,
    returnUrl: null,
    cancelUrl: null,

    uiMode: "QR",
    actionText: null,

    manualInfo: {
      type: "VIETQR",
      title: "Thanh toán bằng VietQR",
      bankName,
      bankAccountNo: accountNo,
      bankAccountName: accountName,
      transferContent: params.transactionCode,

      instruction:
        "Mở ứng dụng ngân hàng, quét mã QR, kiểm tra đúng số tiền và nội dung chuyển khoản trước khi xác nhận.",
    },
  };
}
function buildCashData(transactionCode: string): BuiltPaymentData {
  const cashQrPayload = `CASH:${transactionCode}`;

  return {
    qrCodeUrl: buildQrUrl(cashQrPayload),

    paymentUrl: null,
    deeplink: null,
    returnUrl: null,
    cancelUrl: null,

    uiMode: "CASH",
    actionText: null,

    manualInfo: {
      type: "CASH",
      title: "Thanh toán tại quầy",
      transferContent: transactionCode,
      instruction:
        "Đưa mã QR này cho nhân viên tại quầy. Sau khi nhận tiền mặt, nhân viên sẽ quét mã và xác nhận thanh toán.",
    },
  };
}

function buildGatewayPlaceholderData(params: {
  method: PaymentMethodType;
  bookingIds: number[];
  transactionCode: string;
}): BuiltPaymentData {
  const host = getPaymentHost();

  const ids = params.bookingIds.join(",");

  const returnUrl = `${host}/api/client/payments/return?bookingIds=${ids}`;

  const cancelUrl = `${host}/api/client/payments/cancel?bookingIds=${ids}`;

  const isVnpay = params.method === "VNPAY";

  return {
    qrCodeUrl: null,
    paymentUrl: null,
    deeplink: null,
    returnUrl,
    cancelUrl,
    uiMode: isVnpay ? "IFRAME" : "QR",
    actionText: isVnpay ? "Mở VNPay" : null,
    manualInfo: null,
  };
}

function buildWalletData(params: {
  transactionCode: string;
  amount: number;
  walletBalance?: number;
}): BuiltPaymentData {
  const balance = params.walletBalance ?? 0;
  const after = balance - params.amount;

  return {
    qrCodeUrl: null,
    paymentUrl: null,
    deeplink: null,
    returnUrl: null,
    cancelUrl: null,
    uiMode: "WALLET" as const,
    actionText: after >= 0 ? "Thanh toán bằng ví" : null,
    manualInfo: {
      type: "INTERNAL_WALLET" as const,
      title: "Ví nội bộ XeKhachPT",
      transferContent: params.transactionCode,
      walletBalance: balance,
      walletBalanceAfterPayment: after >= 0 ? after : 0,
      missingAmount: after < 0 ? Math.abs(after) : 0,
      instruction:
        after >= 0
          ? "Số dư ví đủ. Bấm thanh toán để xác nhận."
          : "Số dư ví không đủ. Vui lòng chọn phương thức khác hoặc nạp thêm tiền.",
    },
  };
}

function buildPaymentResponse(params: {
  paymentId: number;
  bookingIds: number[];
  bookingCodes: string[];
  transactionCode: string;
  paymentMethod: PaymentMethodType;
  amount: number;
  expiredAt: string;
  status?: CreatePaymentResponse["status"];
  walletBalance?: number;
}): CreatePaymentResponse {
  const flowType = getFlowType(params.paymentMethod);

  const data =
    params.paymentMethod === "VIETQR"
      ? buildVietQrData({
          transactionCode: params.transactionCode,
          amount: params.amount,
        })
      : params.paymentMethod === "CASH"
        ? buildCashData(params.transactionCode)
        : params.paymentMethod === "INTERNAL_WALLET"
          ? buildWalletData({
              transactionCode: params.transactionCode,
              amount: params.amount,
              walletBalance: params.walletBalance,
            })
          : buildGatewayPlaceholderData({
              method: params.paymentMethod,
              bookingIds: params.bookingIds,
              transactionCode: params.transactionCode,
            });

  return {
    paymentId: params.paymentId,
    bookingIds: params.bookingIds,
    bookingCodes: params.bookingCodes,
    transactionCode: params.transactionCode,
    paymentMethod: params.paymentMethod,
    amount: params.amount,
    status: params.status ?? "PENDING",
    flowType,
    uiMode: data.uiMode,
    actionText: data.actionText,
    qrCodeUrl: data.qrCodeUrl,
    paymentUrl: data.paymentUrl,
    deeplink: data.deeplink,
    returnUrl: data.returnUrl,
    cancelUrl: data.cancelUrl,
    manualInfo: data.manualInfo,
    expiredAt: params.expiredAt,
  };
}

export async function getBookingPaymentSummary(
  bookingId: number,
): Promise<BookingPaymentSummary> {
  const row = await findBookingPaymentSummaryRaw(bookingId);

  if (!row) {
    throw new Error("Booking không tồn tại");
  }

  const seatNumbers = row.seatNumbersRaw
    ? row.seatNumbersRaw.split(",").filter(Boolean)
    : [];

  return {
    bookingId: Number(row.bookingId),
    bookingCode: row.bookingCode,
    tripId: Number(row.tripId),

    routeName: `${row.originCity} → ${row.destinationCity}`,
    vehicleTypeName: row.vehicleTypeName ?? "Chưa cập nhật",

    departureDatetime: row.departureDatetime
      ? formatDateTimeVN(row.departureDatetime)
      : "Chưa cập nhật",

    arrivalDatetime: row.arrivalDatetime
      ? formatDateTimeVN(row.arrivalDatetime)
      : "Chưa cập nhật",

    passengerName: row.passengerName,
    passengerPhone: row.passengerPhone,
    passengerEmail: row.passengerEmail,

    seatCount: Number(row.seatCount),
    seatNumbers,

    pickupPointName: row.pickupPointName,
    pickupPointAddress: row.pickupPointAddress,

    dropoffPointName: row.dropoffPointName,
    dropoffPointAddress: row.dropoffPointAddress,

    ticketPrice: Number(row.seatPrice),
    discountAmount: Number(row.discountAmount ?? 0),
    totalAmount: Number(row.totalAmount),

    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    transactionCode: row.transactionCode,
    paidAt: row.paidAt ? formatDateTimeVN(row.paidAt) : null,

    holdExpiredAt: row.holdExpiredAt,
    bookingStatus: row.bookingStatus,

    vehicleName: row.vehicleName,
    licensePlate: row.licensePlate,

    tripStatus: row.tripStatus,
    tripTicketPrice: row.tripTicketPrice ? Number(row.tripTicketPrice) : null,

    subtotalAmount: Number(row.seatPrice) * Number(row.seatCount),

    bookingType: row.bookingType,
    pickupMethod: row.pickupMethod,
    dropoffMethod: row.dropoffMethod,

    createdAt: formatDateTimeVN(row.createdAt),
    cancelReason: row.cancelReason,
  };
}

async function validateBookingForPayment(conn: any, bookingId: number) {
  const booking = await findBookingForPayment(conn, bookingId);

  if (!booking) {
    throw new Error("Booking không tồn tại");
  }

  if (booking.status !== "PENDING") {
    throw new Error("Booking không còn ở trạng thái chờ thanh toán");
  }

  if (!booking.holdExpiredAt) {
    throw new Error("Booking không có thời gian giữ chỗ");
  }

  if (new Date(booking.holdExpiredAt).getTime() <= Date.now()) {
    throw new Error("Đã hết thời gian giữ chỗ");
  }

  return booking as typeof booking & {
    holdExpiredAt: string;
  };
}

async function confirmBookingSeatsAfterPaid(conn: any, bookingId: number) {
  const holds = await findSeatHoldsForPaymentConfirm(conn, bookingId);

  if (!holds.length) {
    throw new Error("Không tìm thấy ghế đang giữ");
  }

  await insertBookingSeatsAfterPayment(
    conn,
    bookingId,
    Number(holds[0].tripId),
    holds.map((seat) => ({
      seatLayoutDetailId: Number(seat.seatLayoutDetailId),
      seatPrice: Number(seat.seatPrice),
    })),
  );

  await deleteSeatHoldsAfterPayment(conn, bookingId);
}

async function payByInternalWallet(params: {
  conn: PoolConnection;

  paymentId: number;

  bookings: {
    bookingId: number;
    bookingCode: string;
  }[];

  userId: number;

  amount: number;

  transactionCode: string;
}) {
  const bookingIds = params.bookings.map((b) => b.bookingId);

  const bookingUsers = await findBookingUserIdForWallet(
    params.conn,
    bookingIds,
  );

  if (
    bookingUsers.length !== bookingIds.length ||
    bookingUsers.some((b) => !b.userId)
  ) {
    throw new Error("Booking không thuộc tài khoản đăng nhập");
  }

  const invalidUser = bookingUsers.some(
    (b) => Number(b.userId) !== Number(params.userId),
  );

  if (invalidUser) {
    throw new Error("Bạn không có quyền thanh toán booking này");
  }

  const wallet = await findOrCreateWalletForUpdate(params.conn, params.userId);

  if (!wallet) {
    throw new Error("Không tìm thấy ví nội bộ");
  }

  if (wallet.status !== "ACTIVE") {
    throw new Error("Ví nội bộ đang bị khóa");
  }

  const balanceBefore = Number(wallet.balance);

  const amount = Math.round(Number(params.amount));

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Số tiền thanh toán không hợp lệ");
  }

  if (balanceBefore < amount) {
    const missing = amount - balanceBefore;

    throw new Error(
      `Số dư ví không đủ. Còn thiếu ${missing.toLocaleString("vi-VN")} đ`,
    );
  }

  const balanceAfter = balanceBefore - amount;

  await deductWalletBalance(params.conn, {
    walletId: Number(wallet.walletId),
    amount,
  });

  await insertWalletHistory(params.conn, {
    walletId: Number(wallet.walletId),

    paymentId: params.paymentId,

    bookingId: bookingIds[0],

    topupId: null,

    transactionType: "PAYMENT",

    amount,

    balanceBefore,

    balanceAfter,

    referenceCode: `WALLET-PAY-${params.paymentId}-${Date.now()}`,

    description: `Thanh toán ${bookingIds.length} vé`,
  });

  await markPaymentPaidByWallet(params.conn, params.paymentId);

  for (const booking of params.bookings) {
    await confirmBookingAfterPayment(params.conn, booking.bookingId);

    await confirmBookingSeatsAfterPaid(params.conn, booking.bookingId);
  }

  return {
    bookingIds,

    paymentId: params.paymentId,

    walletId: Number(wallet.walletId),

    balanceBefore,

    balanceAfter,

    alreadyProcessed: false,
  };
}

export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<CreatePaymentResponse> {
  return withTransaction(async (conn) => {
    const bookings = await Promise.all(
      payload.bookingIds.map((id) => validateBookingForPayment(conn, id)),
    );

    const booking = bookings[0];
    const oldPayment = await findPendingPaymentByBooking(
      conn,
      booking.bookingId,
    );
    const amount = bookings.reduce((sum, item) => sum + Number(item.amount), 0);
    const transactionCode = `PAY${Date.now()}${nanoid(8).replace(/[^0-9a-zA-Z]/g, "")}`;
    const flowType = getFlowType(payload.paymentMethod);

    let paymentId: number;
    if (oldPayment) {
      paymentId = Number(oldPayment.paymentId);

      await updatePendingPaymentForNewAttempt(conn, {
        paymentId,
        paymentMethod: payload.paymentMethod,
        transactionCode,
        flowType,
        provider: payload.paymentMethod,
      });

      for (const booking of bookings) {
        await insertPaymentBookingIfNotExists(conn, {
          paymentId,
          bookingId: booking.bookingId,
        });
      }
    } else {
      paymentId = await insertPayment(conn, {
        paymentMethod: payload.paymentMethod,
        amount,
        transactionCode,
        flowType,
        provider: payload.paymentMethod,
        gatewayResponse: {
          mode: flowType,
          provider: payload.paymentMethod,
        },
      });

      for (const booking of bookings) {
        await insertPaymentBooking(conn, {
          paymentId,
          bookingId: booking.bookingId,
        });
      }
    }
    if (isGatewayMethod(payload.paymentMethod)) {
      let demoPaymentUrl: string | undefined;

      if (
        isDemoPaymentEnabled() &&
        isDemoPaymentProvider(payload.paymentMethod)
      ) {
        const demoSession = await createDemoPaymentSession(conn, {
          paymentId,
          provider: payload.paymentMethod,
          amount,
          expiredAt: booking.holdExpiredAt,
        });

        demoPaymentUrl = demoSession.demoUrl;
      }

      const gateway = await createGatewayPayment({
        method: payload.paymentMethod,
        bookingIds: payload.bookingIds,
        bookingCode: booking.bookingCode,
        transactionCode,
        amount,
        demoPaymentUrl,
      });
      const response: CreatePaymentResponse = {
        paymentId,
        bookingIds: payload.bookingIds,
        bookingCodes: bookings.map((b) => b.bookingCode),
        transactionCode,
        paymentMethod: payload.paymentMethod,
        amount,
        status: "PENDING",

        flowType: gateway.flowType,
        uiMode: gateway.uiMode,
        actionText: gateway.actionText,

        qrCodeUrl: gateway.qrCodeUrl,
        paymentUrl: gateway.paymentUrl,
        deeplink: gateway.deeplink,
        returnUrl: gateway.returnUrl,
        cancelUrl: gateway.cancelUrl,

        manualInfo: null,
        expiredAt: booking.holdExpiredAt,
      };

      await updatePaymentGatewayData(conn, {
        paymentId,
        providerOrderCode: gateway.providerOrderCode,
        paymentUrl: gateway.paymentUrl,
        qrCodeUrl: gateway.qrCodeUrl,
        deeplink: gateway.deeplink,
        returnUrl: gateway.returnUrl,
        cancelUrl: gateway.cancelUrl,
        gatewayResponse: gateway.gatewayResponse,
      });

      return response;
    }

    if (payload.paymentMethod === "INTERNAL_WALLET") {
      const bookingUsers = await findBookingUserIdForWallet(
        conn,
        payload.bookingIds,
      );

      if (
        bookingUsers.length !== payload.bookingIds.length ||
        bookingUsers.some((b) => !b.userId)
      ) {
        throw new Error("Ví nội bộ chỉ áp dụng cho khách hàng đã đăng nhập");
      }

      const userId = Number(bookingUsers[0].userId);

      const invalidUser = bookingUsers.some((b) => Number(b.userId) !== userId);

      if (invalidUser) {
        throw new Error("Các booking không cùng một tài khoản");
      }

      const wallet = await findOrCreateWalletForUpdate(conn, userId);

      const balance = Number(wallet?.balance ?? 0);

      const response = buildPaymentResponse({
        paymentId: Number(oldPayment?.paymentId ?? paymentId),

        bookingIds: payload.bookingIds,

        bookingCodes: bookings.map((b) => b.bookingCode),

        transactionCode,

        paymentMethod: payload.paymentMethod,

        amount,

        expiredAt: booking.holdExpiredAt,

        walletBalance: balance,
      });

      await updatePaymentGatewayData(conn, {
        paymentId: Number(oldPayment?.paymentId ?? paymentId),

        gatewayResponse: response.manualInfo ?? {},
      });

      return response;
    }

    const response = buildPaymentResponse({
      paymentId,
      bookingIds: payload.bookingIds,
      bookingCodes: bookings.map((b) => b.bookingCode),
      transactionCode,
      paymentMethod: payload.paymentMethod,
      amount,
      expiredAt: booking.holdExpiredAt,
    });

    await updatePaymentGatewayData(conn, {
      paymentId,
      paymentUrl: response.paymentUrl,
      qrCodeUrl: response.qrCodeUrl,
      deeplink: response.deeplink,
      returnUrl: response.returnUrl,
      cancelUrl: response.cancelUrl,
      gatewayResponse: response.manualInfo ?? {},
    });

    return response;
  });
}
export async function updatePaymentMethod(
  payload: UpdatePaymentMethodInput,
): Promise<CreatePaymentResponse> {
  return withTransaction(async (conn) => {
    const bookings = await Promise.all(
      payload.bookingIds.map((id) => validateBookingForPayment(conn, id)),
    );

    const booking = bookings[0];

    const amount = bookings.reduce((sum, item) => sum + Number(item.amount), 0);

    const transactionCode = `PAY${Date.now()}${nanoid(8).replace(
      /[^0-9a-zA-Z]/g,
      "",
    )}`;

    const flowType = getFlowType(payload.paymentMethod);

    const paymentId = payload.paymentId;

    // Kiểm tra payment này có thuộc đúng nhóm booking không
    await validatePaymentBookings(conn, {
      paymentId,
      bookingIds: payload.bookingIds,
    });

    await updatePendingPaymentForNewAttempt(conn, {
      paymentId,
      paymentMethod: payload.paymentMethod,
      transactionCode,
      flowType,
      provider: payload.paymentMethod,
    });

    if (isGatewayMethod(payload.paymentMethod)) {
      let demoPaymentUrl: string | undefined;

      if (
        isDemoPaymentEnabled() &&
        isDemoPaymentProvider(payload.paymentMethod)
      ) {
        const demoSession = await createDemoPaymentSession(conn, {
          paymentId,
          provider: payload.paymentMethod,
          amount,
          expiredAt: booking.holdExpiredAt,
        });

        demoPaymentUrl = demoSession.demoUrl;
      }

      const gateway = await createGatewayPayment({
        method: payload.paymentMethod,
        bookingIds: payload.bookingIds,
        bookingCode: booking.bookingCode,
        transactionCode,
        amount,
        demoPaymentUrl,
      });

      const response: CreatePaymentResponse = {
        paymentId,
        bookingIds: payload.bookingIds,
        bookingCodes: bookings.map((b) => b.bookingCode),
        transactionCode,
        paymentMethod: payload.paymentMethod,
        amount,
        status: "PENDING",

        flowType: gateway.flowType,
        uiMode: gateway.uiMode,
        actionText: gateway.actionText,

        qrCodeUrl: gateway.qrCodeUrl,
        paymentUrl: gateway.paymentUrl,
        deeplink: gateway.deeplink,
        returnUrl: gateway.returnUrl,
        cancelUrl: gateway.cancelUrl,

        manualInfo: null,
        expiredAt: booking.holdExpiredAt,
      };

      await updatePaymentGatewayData(conn, {
        paymentId,
        providerOrderCode: gateway.providerOrderCode,
        paymentUrl: gateway.paymentUrl,
        qrCodeUrl: gateway.qrCodeUrl,
        deeplink: gateway.deeplink,
        returnUrl: gateway.returnUrl,
        cancelUrl: gateway.cancelUrl,
        gatewayResponse: gateway.gatewayResponse,
      });

      return response;
    }

    if (payload.paymentMethod === "INTERNAL_WALLET") {
      const bookingUsers = await findBookingUserIdForWallet(
        conn,
        payload.bookingIds,
      );

      if (
        bookingUsers.length !== payload.bookingIds.length ||
        bookingUsers.some((b) => !b.userId)
      ) {
        throw new Error("Ví nội bộ chỉ áp dụng cho khách hàng đã đăng nhập");
      }

      const userId = Number(bookingUsers[0].userId);

      const invalidUser = bookingUsers.some((b) => Number(b.userId) !== userId);

      if (invalidUser) {
        throw new Error("Các booking không thuộc cùng một tài khoản");
      }

      const wallet = await findOrCreateWalletForUpdate(conn, userId);

      const balance = Number(wallet?.balance ?? 0);

      const response = buildPaymentResponse({
        paymentId,

        bookingIds: payload.bookingIds,

        bookingCodes: bookings.map((b) => b.bookingCode),

        transactionCode,

        paymentMethod: payload.paymentMethod,

        amount,

        expiredAt: booking.holdExpiredAt,

        walletBalance: balance,
      });

      await updatePaymentGatewayData(conn, {
        paymentId,

        gatewayResponse: response.manualInfo ?? {},
      });

      return response;
    }

    const response = buildPaymentResponse({
      paymentId,
      bookingIds: payload.bookingIds,
      bookingCodes: bookings.map((b) => b.bookingCode),
      transactionCode,
      paymentMethod: payload.paymentMethod,
      amount,
      expiredAt: booking.holdExpiredAt,
    });

    await updatePaymentGatewayData(conn, {
      paymentId,
      paymentUrl: response.paymentUrl,
      qrCodeUrl: response.qrCodeUrl,
      deeplink: response.deeplink,
      returnUrl: response.returnUrl,
      cancelUrl: response.cancelUrl,
      gatewayResponse: response.manualInfo ?? {},
    });

    return response;
  });
}

export async function getPaymentStatus(
  paymentId: number,
): Promise<PaymentStatusResponse> {
  const payment = await findPaymentStatusById(paymentId);

  if (!payment) {
    throw new Error("Payment không tồn tại");
  }

  return {
    paymentId: Number(payment.paymentId),
    status: payment.status,
  };
}

export async function customerConfirmManualPayment(payload: {
  paymentId: number;
  userId: number;
  note: string | null;
}) {
  if (!Number.isInteger(payload.userId) || payload.userId <= 0) {
    throw new Error("Tài khoản đăng nhập không hợp lệ");
  }

  const result = await withTransaction(async (conn) => {
    const payment = await findPaymentForConfirm(conn, payload.paymentId);

    if (!payment) {
      throw new Error("Payment không tồn tại");
    }

    if (payment.status === "PAID") {
      return {
        success: true,

        bookingIds: payment.bookingIds,

        paymentId: payment.paymentId,

        alreadyProcessed: true,
      };
    }

    if (payment.status !== "PENDING") {
      throw new Error("Payment không còn ở trạng thái chờ thanh toán");
    }

    if (payment.bookingStatus !== "PENDING") {
      throw new Error("Booking không còn ở trạng thái chờ thanh toán");
    }

    if (
      payment.holdExpiredAt &&
      new Date(payment.holdExpiredAt).getTime() <= Date.now()
    ) {
      throw new Error("Đã hết thời gian giữ chỗ");
    }

    if (payment.paymentMethod === "INTERNAL_WALLET") {
      if (Number(payment.bookingUserId) !== Number(payload.userId)) {
        throw new Error("Bạn không có quyền thanh toán booking này");
      }

      const walletResult = await payByInternalWallet({
        conn,

        paymentId: payment.paymentId,

        bookings: payment.bookings,

        userId: payload.userId,

        amount: Number(payment.amount),

        transactionCode: payment.transactionCode,
      });

      return {
        success: true,

        ...walletResult,
      };
    }

    if (payment.paymentMethod === "CASH") {
      await markPaymentWaitingConfirm(conn, payload.paymentId, payload.note);

      return {
        success: true,

        bookingIds: payment.bookingIds,

        paymentId: payment.paymentId,

        alreadyProcessed: false,
      };
    }

    throw new Error("Phương thức này không hỗ trợ xác nhận thủ công");
  });

  /*
    Side effect sau commit
  */

  if (!result.alreadyProcessed && "balanceAfter" in result) {
    try {
      await sendPaymentResultSideEffects({
        bookingIds: result.bookingIds,

        isPaid: true,
      });
    } catch (error) {
      console.error("[PAYMENT SIDE EFFECT ERROR]", {
        bookingIds: result.bookingIds,

        error,
      });
    }
  }

  return result;
}
export async function getBookingGroupPaymentSummary(
  bookingIds: number[],
): Promise<BookingGroupPaymentSummary> {
  return {
    bookings: await Promise.all(bookingIds.map(getBookingPaymentSummary)),
  };
}
