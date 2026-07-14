import { nanoid } from "nanoid";
import { withTransaction } from "@/lib/server/mysql";
import { formatDateTimeVN } from "@/lib/client/helpers";

import type {
  BookingPaymentSummary,
  CreatePaymentPayload,
  CreatePaymentResponse,
  PaymentStatusResponse,
  PaymentMethodType,
  PaymentFlowType,
  BuiltPaymentData,
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
  insertWalletTransaction,
  markPaymentPaidByWallet,
  confirmBookingAfterPayment,
  findSeatHoldsForPaymentConfirm,
  insertBookingSeatsAfterPayment,
  deleteSeatHoldsAfterPayment,
  findPaymentForConfirm,
} from "@/repositories/client/payment.repo";
import { createGatewayPayment } from "@/services/server/client/payment-gateway.service";

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
  return {
    qrCodeUrl: buildQrUrl(transactionCode),
    paymentUrl: null,
    deeplink: null,
    returnUrl: null,
    cancelUrl: null,
    uiMode: "CASH",
    actionText: null,
    manualInfo: {
      type: "CASH" as const,
      title: "Thanh toán tại quầy",
      transferContent: transactionCode,
      instruction:
        "Đưa mã đặt chỗ hoặc mã QR này cho nhân viên quầy để thanh toán trong thời gian giữ chỗ.",
    },
  };
}

function buildGatewayPlaceholderData(params: {
  method: PaymentMethodType;
  bookingId: number;
  transactionCode: string;
}): BuiltPaymentData {
  const host = getPaymentHost();

  const returnUrl = `${host}/api/client/payments/return?bookingId=${params.bookingId}`;
  const cancelUrl = `${host}/api/client/payments/cancel?bookingId=${params.bookingId}`;

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
  bookingId: number;
  bookingCode: string;
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
              bookingId: params.bookingId,
              transactionCode: params.transactionCode,
            });

  return {
    paymentId: params.paymentId,
    bookingId: params.bookingId,
    bookingCode: params.bookingCode,
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
  conn: any;
  paymentId: number;
  bookingId: number;
  amount: number;
  transactionCode: string;
}) {
  const bookingUser = await findBookingUserIdForWallet(
    params.conn,
    params.bookingId,
  );

  if (!bookingUser?.userId) {
    throw new Error("Ví nội bộ chỉ áp dụng cho khách hàng đã đăng nhập");
  }

  const wallet = await findOrCreateWalletForUpdate(
    params.conn,
    Number(bookingUser.userId),
  );

  if (!wallet) {
    throw new Error("Không tìm thấy ví nội bộ");
  }

  if (wallet.status !== "ACTIVE") {
    throw new Error("Ví nội bộ đang bị khóa");
  }

  const balanceBefore = Number(wallet.balance);
  const balanceAfter = balanceBefore - params.amount;

  if (balanceAfter < 0) {
    throw new Error(
      `Số dư ví không đủ. Còn thiếu ${Math.abs(balanceAfter).toLocaleString(
        "vi-VN",
      )}đ`,
    );
  }

  await deductWalletBalance(params.conn, {
    walletId: Number(wallet.walletId),
    amount: params.amount,
  });

  await insertWalletTransaction(params.conn, {
    walletId: Number(wallet.walletId),
    paymentId: params.paymentId,
    bookingId: params.bookingId,
    transactionType: "PAYMENT",
    amount: params.amount,
    balanceBefore,
    balanceAfter,
    description: `Thanh toán vé ${params.transactionCode}`,
    createdBy: Number(bookingUser.userId),
  });

  await markPaymentPaidByWallet(params.conn, params.paymentId);
  await confirmBookingAfterPayment(params.conn, params.bookingId);
  await confirmBookingSeatsAfterPaid(params.conn, params.bookingId);

  return {
    walletBalanceBefore: balanceBefore,
    walletBalanceAfter: balanceAfter,
  };
}

export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<CreatePaymentResponse> {
  return withTransaction(async (conn) => {
    const booking = await validateBookingForPayment(conn, payload.bookingId);

    const oldPayment = await findPendingPaymentByBooking(
      conn,
      payload.bookingId,
    );

    const amount = Number(booking.amount);
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
    } else {
      paymentId = await insertPayment(conn, {
        bookingId: payload.bookingId,
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
        bookingId: payload.bookingId,
        bookingCode: booking.bookingCode,
        transactionCode,
        amount,
        demoPaymentUrl,
      });

      const response: CreatePaymentResponse = {
        paymentId,
        bookingId: payload.bookingId,
        bookingCode: booking.bookingCode,
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
      const bookingUser = await findBookingUserIdForWallet(
        conn,
        payload.bookingId,
      );

      if (!bookingUser?.userId) {
        throw new Error("Ví nội bộ chỉ áp dụng cho khách hàng đã đăng nhập");
      }

      const wallet = await findOrCreateWalletForUpdate(
        conn,
        Number(bookingUser.userId),
      );
      const balance = Number(wallet?.balance ?? 0);

      const response = buildPaymentResponse({
        paymentId: Number(oldPayment?.paymentId ?? paymentId),
        bookingId: payload.bookingId,
        bookingCode: booking.bookingCode,
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
      bookingId: payload.bookingId,
      bookingCode: booking.bookingCode,
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
    const booking = await validateBookingForPayment(conn, payload.bookingId);

    const oldPayment = await findPendingPaymentByBooking(
      conn,
      payload.bookingId,
    );

    if (!oldPayment) {
      throw new Error("Payment không tồn tại");
    }

    if (Number(oldPayment.paymentId) !== Number(payload.paymentId)) {
      throw new Error("Payment không khớp với booking");
    }

    const amount = Number(oldPayment.amount);
    const transactionCode = `PAY${Date.now()}${nanoid(8).replace(/[^0-9a-zA-Z]/g, "")}`;
    const flowType = getFlowType(payload.paymentMethod);
    const paymentId = Number(oldPayment.paymentId);

    await updatePendingPaymentForNewAttempt(conn, {
      paymentId,
      paymentMethod: payload.paymentMethod,
      transactionCode,
      flowType,
      provider: payload.paymentMethod,
    });
    if (isGatewayMethod(payload.paymentMethod)) {
      const paymentId = Number(oldPayment.paymentId);

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
        bookingId: payload.bookingId,
        bookingCode: booking.bookingCode,
        transactionCode,
        amount,
        demoPaymentUrl,
      });

      const response: CreatePaymentResponse = {
        paymentId,
        bookingId: payload.bookingId,
        bookingCode: booking.bookingCode,
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
      const bookingUser = await findBookingUserIdForWallet(
        conn,
        payload.bookingId,
      );

      if (!bookingUser?.userId) {
        throw new Error("Ví nội bộ chỉ áp dụng cho khách hàng đã đăng nhập");
      }

      const wallet = await findOrCreateWalletForUpdate(
        conn,
        Number(bookingUser.userId),
      );
      const balance = Number(wallet?.balance ?? 0);

      const response = buildPaymentResponse({
        paymentId,
        bookingId: payload.bookingId,
        bookingCode: booking.bookingCode,
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
      bookingId: payload.bookingId,
      bookingCode: booking.bookingCode,
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
    bookingId: Number(payment.bookingId),
    status: payment.status,
  };
}

export async function customerConfirmManualPayment(payload: {
  paymentId: number;
  note: string | null;
}) {
  return withTransaction(async (conn) => {
    const payment = await findPaymentForConfirm(conn, payload.paymentId);

    if (!payment) {
      throw new Error("Payment không tồn tại");
    }

    if (payment.paymentMethod === "INTERNAL_WALLET") {
      await payByInternalWallet({
        conn,
        paymentId: Number(payment.paymentId),
        bookingId: Number(payment.bookingId),
        amount: Number(payment.amount),
        transactionCode: payment.transactionCode,
      });

      return { success: true };
    }

    if (payment.paymentMethod === "CASH") {
      await markPaymentWaitingConfirm(payload.paymentId, payload.note);
      return { success: true };
    }

    return { success: true };
  });
}
