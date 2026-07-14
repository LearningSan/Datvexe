import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { withTransaction } from "@/lib/server/mysql";

import {
  confirmPaymentByTransactionCode,
  sendPaymentResultSideEffects,
} from "@/services/server/client/payment-webhook.service";

import { findPaymentByProviderOrderCode } from "@/repositories/client/payment.repo";

type ZaloPayCallbackBody = {
  data?: string;
  mac?: string;
  type?: number;
};

type ZaloPayCallbackData = {
  app_id: number;
  app_trans_id: string;
  app_time: number;
  app_user: string;
  amount: number;
  embed_data: string;
  item: string;
  zp_trans_id: number;
  server_time: number;
  channel?: number;
  merchant_user_id?: string;
  user_fee_amount?: number;
  discount_amount?: number;
};

function zaloPayResponse(returnCode: number, returnMessage: string) {
  return NextResponse.json(
    {
      return_code: returnCode,
      return_message: returnMessage,
    },
    { status: 200 },
  );
}

function getZaloPayKey2(): string {
  const key2 = process.env.ZALOPAY_KEY2?.trim();

  if (!key2) {
    throw new Error("Thiếu biến môi trường ZALOPAY_KEY2");
  }

  return key2;
}

function safeEqualHex(first: string, second: string): boolean {
  if (!/^[0-9a-f]+$/i.test(first) || !/^[0-9a-f]+$/i.test(second)) {
    return false;
  }

  const firstBuffer = Buffer.from(first, "hex");

  const secondBuffer = Buffer.from(second, "hex");

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

export async function POST(request: NextRequest) {
  let body: ZaloPayCallbackBody;

  try {
    body = (await request.json()) as ZaloPayCallbackBody;
  } catch {
    return zaloPayResponse(0, "Invalid JSON");
  }

  try {
    const dataString = typeof body.data === "string" ? body.data : "";

    const requestMac = typeof body.mac === "string" ? body.mac.trim() : "";

    if (!dataString || !requestMac) {
      return zaloPayResponse(-1, "Missing data or mac");
    }

    /*
     * Tính HMAC trên nguyên chuỗi body.data.
     * Không JSON.parse trước khi ký.
     */
    const calculatedMac = crypto
      .createHmac("sha256", getZaloPayKey2())
      .update(dataString)
      .digest("hex");

    if (!safeEqualHex(calculatedMac, requestMac)) {
      console.error("[ZALOPAY INVALID MAC]", {
        requestMac,
        calculatedMac,
      });

      return zaloPayResponse(-1, "mac not equal");
    }

    const callbackData = JSON.parse(dataString) as ZaloPayCallbackData;

    const appTransId = String(callbackData.app_trans_id ?? "").trim();

    const amount = Number(callbackData.amount);

    const zpTransId = String(callbackData.zp_trans_id ?? "").trim();

    if (!appTransId) {
      return zaloPayResponse(0, "Missing app_trans_id");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return zaloPayResponse(0, "Invalid amount");
    }

    /*
     * Khi tạo ZaloPay:
     *
     * providerOrderCode = appTransId
     *
     * Vì service xác nhận hiện tại dùng transactionCode,
     * cần tìm payment qua provider_order_code trước.
     */
    const payment = await findPaymentByProviderOrderCode(appTransId);

    if (!payment) {
      console.error("[ZALOPAY PAYMENT NOT FOUND]", {
        appTransId,
        amount,
      });

      /*
       * return_code = 0 để ZaloPay thử callback lại.
       */
      return zaloPayResponse(0, "Transaction not found");
    }

    const result = await withTransaction(async (conn) => {
      return confirmPaymentByTransactionCode({
        conn,
        transactionCode: payment.transactionCode,
        status: "SUCCESS",
        amount,
        gatewayTransactionId: zpTransId || appTransId,
        gatewayResponse: body,
      });
    });

    if (!result.alreadyProcessed) {
      try {
        await sendPaymentResultSideEffects({
          bookingId: result.bookingId,
          isPaid: true,
        });
      } catch (sideEffectError) {
        console.error("[ZALOPAY SIDE EFFECT ERROR]", sideEffectError);
      }
    }

    return zaloPayResponse(1, "success");
  } catch (error: unknown) {
    console.error("[ZALOPAY CALLBACK ERROR]", error);

    /*
     * return_code = 0 để ZaloPay có thể gửi lại callback.
     */
    return zaloPayResponse(
      0,
      error instanceof Error ? error.message : "Callback processing failed",
    );
  }
}
