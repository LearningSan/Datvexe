import axios from "axios";
import crypto from "crypto";
import { PayOS } from "@payos/node";
import { VNPay, ignoreLogger, ProductCode, VnpLocale } from "vnpay";

import type {
  PaymentMethodType,
  PaymentFlowType,
  PaymentUiMode,
} from "@/types/client/payment/payment.type";

type Input = {
  method: PaymentMethodType;
  bookingId: number;
  bookingCode: string;
  transactionCode: string;
  amount: number;
  ipAddress?: string;
};

export type GatewayResult = {
  providerOrderCode: string | null;
  paymentUrl: string | null;
  qrCodeUrl: string | null;
  deeplink: string | null;
  returnUrl: string | null;
  cancelUrl: string | null;
  flowType: PaymentFlowType;
  uiMode: PaymentUiMode;
  actionText: string | null;
  gatewayResponse: unknown;
};
function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Thiếu biến môi trường ${name}`);
  }

  return value;
}

export function getPayosClient(): PayOS {
  return new PayOS({
    clientId: requireEnv("PAYOS_CLIENT_ID"),
    apiKey: requireEnv("PAYOS_API_KEY"),
    checksumKey: requireEnv("PAYOS_CHECKSUM_KEY"),
  });
}
function appHost() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PAYMENT_PUBLIC_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function publicHost() {
  return (
    process.env.PAYMENT_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function resultUrl(bookingId: number) {
  return `${appHost()}/payment/result?bookingId=${bookingId}`;
}

function cancelUrl(bookingId: number) {
  return `${appHost()}/api/client/payments/cancel?bookingId=${bookingId}`;
}

function buildMomoOrderId(transactionCode: string) {
  return transactionCode.replace(/[^0-9a-zA-Z._:-]/g, "");
}

export async function createGatewayPayment(
  input: Input,
): Promise<GatewayResult> {
  if (input.method === "PAYOS") return createPayos(input);
  if (input.method === "VNPAY") return createVnpay(input);
  if (input.method === "MOMO") return createMomo(input);
  if (input.method === "ZALOPAY") return createZalopay(input);

  throw new Error(`${input.method} không phải gateway`);
}

async function createPayos(input: Input): Promise<GatewayResult> {
  const payOS = getPayosClient();

  const orderCode = Number(String(Date.now()).slice(-10));

  const result = await payOS.paymentRequests.create({
    orderCode,
    amount: Math.round(input.amount),
    description: input.bookingCode.slice(0, 25),
    returnUrl: resultUrl(input.bookingId),
    cancelUrl: cancelUrl(input.bookingId),
    items: [
      {
        name: `Vé xe ${input.bookingCode}`,
        quantity: 1,
        price: Math.round(input.amount),
      },
    ],
  });

  return {
    providerOrderCode: String(orderCode),
    paymentUrl: result.checkoutUrl ?? null,
    qrCodeUrl: result.qrCode ?? null,
    deeplink: null,
    returnUrl: resultUrl(input.bookingId),
    cancelUrl: cancelUrl(input.bookingId),
    flowType: "QR",
    uiMode: "QR",
    actionText: "Mở trang PayOS",
    gatewayResponse: result,
  };
}

async function createVnpay(input: Input): Promise<GatewayResult> {
  const vnpay = new VNPay({
    tmnCode: process.env.VNPAY_TMN_CODE!,
    secureSecret: process.env.VNPAY_SECURE_SECRET!,
    vnpayHost: process.env.VNPAY_PAYMENT_URL!,
    testMode: true,
    loggerFn: ignoreLogger,
  });

  const paymentUrl = vnpay.buildPaymentUrl({
    vnp_Amount: Math.round(input.amount),
    vnp_IpAddr: input.ipAddress || "127.0.0.1",
    vnp_TxnRef: input.transactionCode,
    vnp_OrderInfo: `Thanh toan ve ${input.bookingCode}`,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: `${publicHost()}/api/client/payments/vnpay/return?bookingId=${input.bookingId}`,
    vnp_Locale: VnpLocale.VN,
  });

  return {
    providerOrderCode: input.transactionCode,
    paymentUrl,
    qrCodeUrl: null,
    deeplink: null,
    returnUrl: `${publicHost()}/api/client/payments/vnpay/return?bookingId=${input.bookingId}`,
    cancelUrl: cancelUrl(input.bookingId),
    flowType: "IFRAME",
    uiMode: "IFRAME",
    actionText: "Mở VNPay",
    gatewayResponse: { paymentUrl },
  };
}
function getMomoQrData(data: {
  qrCodeUrl?: string;
  deeplink?: string;
  payUrl?: string;
}) {
  return data.qrCodeUrl || data.deeplink || data.payUrl || null;
}
async function createMomo(input: Input): Promise<GatewayResult> {
  const partnerCode = process.env.MOMO_PARTNER_CODE?.trim();
  const accessKey = process.env.MOMO_ACCESS_KEY?.trim();
  const secretKey = process.env.MOMO_SECRET_KEY?.trim();
  const endpoint = process.env.MOMO_ENDPOINT?.trim();

  if (!partnerCode || !accessKey || !secretKey || !endpoint) {
    console.error("[MOMO ENV MISSING]", {
      hasPartnerCode: Boolean(partnerCode),
      hasAccessKey: Boolean(accessKey),
      hasSecretKey: Boolean(secretKey),
      hasEndpoint: Boolean(endpoint),
    });

    throw new Error("Thiếu cấu hình thanh toán MoMo");
  }

  // Log cấu hình an toàn, không in key thật.
  console.log("[MOMO CONFIG]", {
    endpoint,
    partnerCode,
    accessKeyLength: accessKey.length,
    secretKeyLength: secretKey.length,
  });

  const timestamp = Date.now();

  const requestId = buildMomoOrderId(
    `REQ_${input.transactionCode}_${timestamp}`,
  );

  const orderId = buildMomoOrderId(`${input.transactionCode}_${timestamp}`);

  const amount = String(Math.round(input.amount));
  const orderInfo = `Thanh toan ve ${input.bookingCode}`;

  const redirectUrl =
    process.env.MOMO_REDIRECT_URL?.trim() || resultUrl(input.bookingId);

  const ipnUrl =
    process.env.MOMO_IPN_URL?.trim() ||
    `${publicHost()}/api/client/payments/momo/ipn`;

  const requestType = "captureWallet";
  const extraData = "";

  const rawSignature =
    `accessKey=${accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${ipnUrl}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${partnerCode}` +
    `&redirectUrl=${redirectUrl}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature, "utf8")
    .digest("hex");

  // Log request trước khi gửi.
  console.log("[MOMO CREATE REQUEST]", {
    endpoint,
    partnerCode,
    requestId,
    orderId,
    amount,
    orderInfo,
    redirectUrl,
    ipnUrl,
    requestType,
    extraData,
    rawSignature,
    signature,
  });

  try {
    const res = await axios.post(
      endpoint,
      {
        partnerCode,
        accessKey,
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        extraData,
        requestType,
        signature,
        lang: "vi",
      },
      {
        timeout: 30_000,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    // Log toàn bộ thông tin quan trọng MoMo trả về.
    console.log("[MOMO CREATE RESPONSE]", {
      status: res.status,
      partnerCode: res.data?.partnerCode,
      requestId: res.data?.requestId,
      orderId: res.data?.orderId,
      resultCode: res.data?.resultCode,
      message: res.data?.message,
      responseTime: res.data?.responseTime,
      hasPayUrl: Boolean(res.data?.payUrl),
      hasDeeplink: Boolean(res.data?.deeplink),
      hasQrCodeUrl: Boolean(res.data?.qrCodeUrl),
    });

    if (Number(res.data.resultCode) !== 0) {
      throw new Error(
        `[MoMo ${res.data.resultCode}] ${
          res.data.message || "MoMo từ chối tạo giao dịch"
        }`,
      );
    }

    const momoQrData = getMomoQrData({
      qrCodeUrl: res.data.qrCodeUrl,
      deeplink: res.data.deeplink,
      payUrl: res.data.payUrl,
    });

    if (!momoQrData) {
      throw new Error("MoMo không trả về dữ liệu QR thanh toán");
    }

    return {
      providerOrderCode: orderId,
      paymentUrl: res.data.payUrl ?? null,
      qrCodeUrl: momoQrData,
      deeplink: res.data.deeplink ?? null,
      returnUrl: redirectUrl,
      cancelUrl: cancelUrl(input.bookingId),
      flowType: "QR",
      uiMode: "QR",
      actionText: "Mở ứng dụng MoMo",
      gatewayResponse: res.data,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error("[MOMO AXIOS ERROR]", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        responseData: error.response?.data,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
      });

      throw new Error(
        error.response?.data?.subErrors?.[0]?.message ||
          error.response?.data?.message ||
          `Không thể kết nối MoMo: ${error.message}`,
      );
    }

    console.error("[MOMO BUSINESS ERROR]", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error instanceof Error
      ? error
      : new Error("Tạo thanh toán MoMo thất bại");
  }
}
async function createZalopay(input: Input): Promise<GatewayResult> {
  const appId = process.env.ZALOPAY_APP_ID!;
  const key1 = process.env.ZALOPAY_KEY1!;
  const endpoint = process.env.ZALOPAY_ENDPOINT!;

  const appTransId = buildZaloPayTransId(input.transactionCode);
  const appTime = Date.now();
  const amount = Math.round(input.amount);
  const appUser = `booking_${input.bookingId}`;

  const embedData = {
    redirecturl: resultUrl(input.bookingId),
  };

  const item = [
    {
      itemid: String(input.bookingId),
      itemname: `Vé xe ${input.bookingCode}`,
      itemprice: amount,
      itemquantity: 1,
    },
  ];

  const macData = `${appId}|${appTransId}|${appUser}|${amount}|${appTime}|${JSON.stringify(
    embedData,
  )}|${JSON.stringify(item)}`;

  const mac = crypto.createHmac("sha256", key1).update(macData).digest("hex");

  const body = new URLSearchParams({
    app_id: appId,
    app_user: appUser,
    app_trans_id: appTransId,
    app_time: String(appTime),
    amount: String(amount),
    item: JSON.stringify(item),
    embed_data: JSON.stringify(embedData),
    description: `Thanh toán vé ${input.bookingCode}`,
    bank_code: "",
    callback_url: `${publicHost()}/api/client/payments/zalopay/callback`,
    mac,
  });

  try {
    const res = await axios.post(endpoint, body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return {
      providerOrderCode: appTransId,
      paymentUrl: res.data.order_url ?? null,
      qrCodeUrl: res.data.qr_code ?? null,
      deeplink: null,
      returnUrl: resultUrl(input.bookingId),
      cancelUrl: cancelUrl(input.bookingId),
      flowType: "QR",
      uiMode: res.data.qr_code ? "QR" : "REDIRECT",
      actionText: "Mở ZaloPay",
      gatewayResponse: res.data,
    };
  } catch (error: any) {
    console.error(
      "[ZALOPAY CREATE ERROR]",
      error.response?.data || error.message,
    );
    throw new Error(
      error.response?.data?.return_message || "Tạo thanh toán ZaloPay thất bại",
    );
  }
}

function buildZaloPayTransId(transactionCode: string) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yy}${mm}${dd}_${transactionCode}`.slice(0, 40);
}
