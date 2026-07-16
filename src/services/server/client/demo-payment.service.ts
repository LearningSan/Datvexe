import crypto from "crypto";
import { withTransaction } from "@/lib/server/mysql";

import {
  findDemoSessionForUpdate,
  increaseDemoAttemptCount,
  markDemoSessionProcessing,
  markDemoSessionSuccess,
  markDemoSessionExpired,
  updateDemoSessionVerification,
} from "@/repositories/client/demo-payment.repo";

import {
  confirmPaymentByTransactionCode,
  sendPaymentResultSideEffects,
} from "@/services/server/client/payment-webhook.service";
import {
  expireOpenDemoSessions,
  findDemoSessionByTokenHash,
  insertDemoPaymentSession,
  type DemoPaymentProvider,
} from "@/repositories/client/demo-payment.repo";

import type { PoolConnection } from "@/lib/server/mysql";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Thiếu biến môi trường ${name}`);
  }

  return value;
}

function appHost(): string {
  return requireEnv("APP_URL").replace(/\/+$/, "");
}

function createRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashDemoPaymentToken(rawToken: string): string {
  return crypto
    .createHmac("sha256", requireEnv("DEMO_PAYMENT_SECRET"))
    .update(rawToken)
    .digest("hex");
}

function getDemoPath(provider: DemoPaymentProvider): string {
  switch (provider) {
    case "VNPAY":
      return "/demo-payment/vnpay";

    case "MOMO":
      return "/demo-payment/momo";

    case "ZALOPAY":
      return "/demo-payment/zalopay";
  }
}

export function isDemoPaymentEnabled(): boolean {
  return process.env.DEMO_PAYMENT_ENABLED === "true";
}

export function isDemoPaymentProvider(
  method: string,
): method is DemoPaymentProvider {
  return method === "VNPAY" || method === "MOMO" || method === "ZALOPAY";
}

export async function createDemoPaymentSession(
  conn: PoolConnection,
  input: {
    paymentId: number;
    provider: DemoPaymentProvider;
    amount: number;
    expiredAt: string | Date;
  },
): Promise<{
  demoSessionId: number;
  token: string;
  demoUrl: string;
}> {
  if (!Number.isInteger(input.paymentId) || input.paymentId <= 0) {
    throw new Error("paymentId demo không hợp lệ");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Số tiền demo không hợp lệ");
  }

  const expiredAt = new Date(input.expiredAt);

  if (Number.isNaN(expiredAt.getTime())) {
    throw new Error("Thời gian hết hạn demo không hợp lệ");
  }

  if (expiredAt.getTime() <= Date.now()) {
    throw new Error("Giao dịch demo đã hết hạn");
  }

  await expireOpenDemoSessions(conn, input.paymentId);

  const token = createRawToken();
  const tokenHash = hashDemoPaymentToken(token);

  const demoSessionId = await insertDemoPaymentSession(conn, {
    paymentId: input.paymentId,
    provider: input.provider,
    tokenHash,
    amount: Math.round(input.amount),
    expiredAt,
  });

  const url = new URL(getDemoPath(input.provider), appHost());

  url.searchParams.set("token", token);

  return {
    demoSessionId,
    token,
    demoUrl: url.toString(),
  };
}

export async function getDemoPaymentSession(rawToken: string) {
  const token = rawToken.trim();

  if (!token) {
    throw new Error("Thiếu token thanh toán demo");
  }

  const tokenHash = hashDemoPaymentToken(token);

  const session = await findDemoSessionByTokenHash(tokenHash);

  if (!session) {
    throw new Error("Phiên thanh toán demo không tồn tại");
  }

  const expiredAt = new Date(session.expiredAt);

  const isExpired =
    expiredAt.getTime() <= Date.now() || session.status === "EXPIRED";

  return {
    demoSessionId: Number(session.demoSessionId),

    provider: session.provider,

    amount: Number(session.amount),

    status: isExpired ? ("EXPIRED" as const) : session.status,

    bookingCode: session.bookingCode,
    transactionCode: session.transactionCode,

    expiredAt: expiredAt.toISOString(),

    paymentStatus: session.paymentStatus,

    customerPhone: session.customerPhone,
    selectedBank: session.selectedBank,
    accountNumberMasked: session.accountNumberMasked,
    accountHolder: session.accountHolder,
    paymentSource: session.paymentSource,
  };
}
type VerifyDemoPaymentInput = {
  token: string;
  provider: DemoPaymentProvider;
  amount: number;

  customerPhone?: string;
  selectedBank?: string;
  accountNumber?: string;
  accountHolder?: string;
  paymentSource?: string;
};

type ConfirmDemoPaymentInput = {
  token: string;
  provider: DemoPaymentProvider;
  verificationCode: string;
};

function validateDemoProvider(
  actual: DemoPaymentProvider,
  expected: DemoPaymentProvider,
) {
  if (actual !== expected) {
    throw new Error("Phương thức thanh toán không khớp với phiên demo");
  }
}

function validateDemoAmount(databaseAmount: number, submittedAmount: number) {
  if (!Number.isFinite(submittedAmount) || submittedAmount <= 0) {
    throw new Error("Số tiền thanh toán không hợp lệ");
  }

  if (Math.round(databaseAmount) !== Math.round(submittedAmount)) {
    throw new Error(
      `Số tiền không khớp. Số tiền cần thanh toán là ${Math.round(
        databaseAmount,
      ).toLocaleString("vi-VN")} đ`,
    );
  }
}

function maskAccountNumber(value?: string): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\D/g, "");

  if (normalized.length <= 4) {
    return normalized;
  }

  return `${"*".repeat(normalized.length - 4)}${normalized.slice(-4)}`;
}

function validateVnpayInformation(input: VerifyDemoPaymentInput) {
  const bank = input.selectedBank?.trim();
  const accountNumber = input.accountNumber?.replace(/\s/g, "") ?? "";
  const accountHolder = input.accountHolder?.trim() ?? "";

  if (!bank) {
    throw new Error("Vui lòng chọn ngân hàng");
  }

  if (!/^\d{8,16}$/.test(accountNumber)) {
    throw new Error("Số tài khoản phải gồm từ 8 đến 16 chữ số");
  }

  if (accountHolder.length < 2) {
    throw new Error("Vui lòng nhập tên chủ tài khoản");
  }
}
function validateMomoInformation(input: VerifyDemoPaymentInput) {
  const phoneNumber = input.customerPhone?.trim() ?? "";

  if (!/^0\d{9}$/.test(phoneNumber)) {
    throw new Error("Số điện thoại MoMo phải gồm 10 chữ số và bắt đầu bằng 0");
  }
}

function validateZalopayInformation(input: VerifyDemoPaymentInput) {
  const phoneNumber = input.customerPhone?.trim() ?? "";

  const paymentSource = input.paymentSource?.trim() ?? "";

  if (!/^0\d{9}$/.test(phoneNumber)) {
    throw new Error(
      "Số điện thoại ZaloPay phải gồm 10 chữ số và bắt đầu bằng 0",
    );
  }

  if (
    paymentSource !== "WALLET" &&
    paymentSource !== "LINKED_BANK" &&
    paymentSource !== "DOMESTIC_CARD"
  ) {
    throw new Error("Vui lòng chọn nguồn tiền thanh toán");
  }
}
function getExpectedVerificationCode(provider: DemoPaymentProvider): string {
  if (provider === "VNPAY") {
    return "123456";
  }

  if (provider === "MOMO") {
    return "000000";
  }

  return "888888";
}

export async function verifyDemoPaymentInformation(
  input: VerifyDemoPaymentInput,
) {
  const rawToken = input.token.trim();

  if (!rawToken) {
    throw new Error("Thiếu token thanh toán demo");
  }

  if (!isDemoPaymentProvider(input.provider)) {
    throw new Error("Phương thức demo không hợp lệ");
  }

  if (input.provider === "VNPAY") {
    validateVnpayInformation(input);
  }

  if (input.provider === "MOMO") {
    validateMomoInformation(input);
  }

  if (input.provider === "ZALOPAY") {
    validateZalopayInformation(input);
  }
  const tokenHash = hashDemoPaymentToken(rawToken);

  return withTransaction(async (conn) => {
    const session = await findDemoSessionForUpdate(conn, tokenHash);

    if (!session) {
      throw new Error("Phiên thanh toán demo không tồn tại");
    }

    validateDemoProvider(session.provider, input.provider);

    if (session.paymentStatus === "PAID") {
      return {
        success: true,
        alreadyPaid: true,
        status: "SUCCESS" as const,
      };
    }

    if (session.status === "SUCCESS") {
      return {
        success: true,
        alreadyPaid: true,
        status: "SUCCESS" as const,
      };
    }

    const expiredAt = new Date(session.expiredAt);

    if (expiredAt.getTime() <= Date.now() || session.status === "EXPIRED") {
      await markDemoSessionExpired(conn, Number(session.demoSessionId));

      throw new Error("Phiên thanh toán demo đã hết hạn");
    }

    if (session.status !== "PENDING" && session.status !== "VERIFY_REQUIRED") {
      throw new Error("Phiên thanh toán đang được xử lý");
    }

    validateDemoAmount(Number(session.amount), Number(input.amount));

    await updateDemoSessionVerification(conn, {
      demoSessionId: Number(session.demoSessionId),
      customerPhone: input.customerPhone?.trim() || null,
      selectedBank: input.selectedBank?.trim() || null,
      accountNumberMasked: maskAccountNumber(input.accountNumber),
      accountHolder: input.accountHolder?.trim() || null,
      paymentSource: input.paymentSource?.trim() || null,
    });

    return {
      success: true,
      alreadyPaid: false,
      status: "VERIFY_REQUIRED" as const,
      demoSessionId: Number(session.demoSessionId),
    };
  });
}

export async function confirmDemoPayment(input: ConfirmDemoPaymentInput) {
  const rawToken = input.token.trim();
  const verificationCode = input.verificationCode.trim();

  if (!rawToken) {
    throw new Error("Thiếu token thanh toán demo");
  }

  if (!isDemoPaymentProvider(input.provider)) {
    throw new Error("Phương thức demo không hợp lệ");
  }

  if (!verificationCode) {
    throw new Error("Vui lòng nhập mã xác thực");
  }

  const tokenHash = hashDemoPaymentToken(rawToken);

  const result = await withTransaction(async (conn) => {
    const session = await findDemoSessionForUpdate(conn, tokenHash);

    if (!session) {
      throw new Error("Phiên thanh toán demo không tồn tại");
    }

    validateDemoProvider(session.provider, input.provider);

    if (session.status === "SUCCESS" || session.paymentStatus === "PAID") {
      return {
        success: true,
        bookingId: Number(session.bookingId),
        transactionCode: session.transactionCode,
        alreadyProcessed: true,
      };
    }

    const expiredAt = new Date(session.expiredAt);

    if (expiredAt.getTime() <= Date.now() || session.status === "EXPIRED") {
      await markDemoSessionExpired(conn, Number(session.demoSessionId));

      throw new Error("Phiên thanh toán demo đã hết hạn");
    }

    if (session.status !== "VERIFY_REQUIRED") {
      throw new Error("Vui lòng nhập thông tin thanh toán trước");
    }

    await increaseDemoAttemptCount(conn, Number(session.demoSessionId));

    if (Number(session.attemptCount) >= 4) {
      throw new Error("Bạn đã nhập sai mã xác thực quá nhiều lần");
    }

    const expectedCode = getExpectedVerificationCode(input.provider);

    if (verificationCode !== expectedCode) {
      throw new Error("Mã xác thực demo không chính xác");
    }

    await markDemoSessionProcessing(conn, Number(session.demoSessionId));

    const confirmation = await confirmPaymentByTransactionCode({
      conn,
      transactionCode: session.transactionCode,
      status: "SUCCESS",
      amount: Number(session.amount),
      gatewayTransactionId: `DEMO-${input.provider}-${Date.now()}`,
      gatewayResponse: {
        environment: "SANDBOX_DEMO",
        provider: input.provider,
        demoSessionId: Number(session.demoSessionId),
        selectedBank: session.selectedBank,
        accountNumberMasked: session.accountNumberMasked,
        accountHolder: session.accountHolder,
        paymentSource: session.paymentSource,
      },
    });

    await markDemoSessionSuccess(conn, Number(session.demoSessionId));

    return {
      success: true,
      bookingId: confirmation.bookingId,
      transactionCode: session.transactionCode,
      alreadyProcessed: confirmation.alreadyProcessed,
    };
  });

  if (!result.alreadyProcessed) {
    console.log("[DEMO PAYMENT SIDE EFFECT START]", {
      bookingId: result.bookingId,
    });

    try {
      await sendPaymentResultSideEffects({
        bookingId: result.bookingId,
        isPaid: true,
      });

      console.log("[DEMO PAYMENT SIDE EFFECT SUCCESS]", {
        bookingId: result.bookingId,
      });
    } catch (error) {
      console.error("[DEMO PAYMENT SIDE EFFECT ERROR]", {
        bookingId: result.bookingId,
        error,
      });
    }
  }

  return result;
}
