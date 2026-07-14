import { NextRequest, NextResponse } from "next/server";

import { withTransaction } from "@/lib/server/mysql";

import { getVnpayClient } from "@/services/server/client/payment-gateway.service";

import {
  confirmPaymentByTransactionCode,
  sendPaymentResultSideEffects,
} from "@/services/server/client/payment-webhook.service";
import type { ReturnQueryFromVNPay } from "vnpay";
function vnpayResponse(rspCode: string, message: string) {
  return NextResponse.json(
    {
      RspCode: rspCode,
      Message: message,
    },
    { status: 200 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const query = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    ) as ReturnQueryFromVNPay;

    const vnpay = getVnpayClient();

    const verified = vnpay.verifyIpnCall(query);

    console.log("[VNPAY IPN VERIFIED]", {
      isVerified: verified.isVerified,
      isSuccess: verified.isSuccess,
      message: verified.message,
      transactionCode: verified.vnp_TxnRef,
      amount: verified.vnp_Amount,
      transactionNo: verified.vnp_TransactionNo,
      responseCode: verified.vnp_ResponseCode,
      transactionStatus: verified.vnp_TransactionStatus,
    });

    if (!verified.isVerified) {
      return vnpayResponse("97", "Invalid Checksum");
    }

    const transactionCode = String(verified.vnp_TxnRef ?? "").trim();

    if (!transactionCode) {
      return vnpayResponse("01", "Order Not Found");
    }

    const amount = Number(verified.vnp_Amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return vnpayResponse("04", "Invalid Amount");
    }

    /*
     * isSuccess = false nghĩa là giao dịch không thành công.
     *
     * Service hiện tại của bạn sẽ:
     * payment -> FAILED
     * booking -> CANCELLED
     */
    const status = verified.isSuccess
      ? ("SUCCESS" as const)
      : ("FAILED" as const);

    const gatewayTransactionId =
      verified.vnp_TransactionNo != null
        ? String(verified.vnp_TransactionNo)
        : transactionCode;

    const result = await withTransaction(async (conn) => {
      return confirmPaymentByTransactionCode({
        conn,
        transactionCode,
        status,
        amount,
        gatewayTransactionId,
        gatewayResponse: query,
      });
    });

    /*
     * Transaction đã commit mới gửi email và notification.
     */
    if (!result.alreadyProcessed) {
      try {
        await sendPaymentResultSideEffects({
          bookingId: result.bookingId,
          isPaid: status === "SUCCESS",
        });
      } catch (sideEffectError) {
        console.error("[VNPAY SIDE EFFECT ERROR]", sideEffectError);
      }
    }

    if (result.alreadyProcessed) {
      return vnpayResponse("02", "Order Already Confirmed");
    }

    return vnpayResponse("00", "Confirm Success");
  } catch (error: unknown) {
    console.error("[VNPAY IPN ERROR]", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "Transaction không tồn tại") {
      return vnpayResponse("01", "Order Not Found");
    }

    if (message === "Số tiền thanh toán không khớp") {
      return vnpayResponse("04", "Invalid Amount");
    }

    return vnpayResponse("99", "Unknown Error");
  }
}
