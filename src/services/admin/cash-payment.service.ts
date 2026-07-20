import adminApi from "@/lib/admin/api";

import type { ApiResponse } from "@/types/common/api.type";

import type {
  AdminCashPaymentItem,
  AdminCashPaymentListParams,
  AdminCashPaymentListResponse,
  ConfirmCashPaymentPayload,
  ConfirmCashPaymentResponse,
  LookupCashPaymentPayload,
} from "@/types/admin/payments/cash-payment.type";

function throwApiError(error: unknown, fallback: string): never {
  const value = error as {
    response?: {
      data?: {
        message?: string;
        error?: string;
      };
    };
    message?: string;
  };

  throw new Error(
    value.response?.data?.message ||
      value.response?.data?.error ||
      value.message ||
      fallback,
  );
}

export async function fetchAdminCashPayments(
  params: AdminCashPaymentListParams,
) {
  try {
    const response = await adminApi.get<ApiResponse<AdminCashPaymentListResponse>>(
      "/admin/cash-payments",
      {
        params,
      },
    );

    return response.data.data;
  } catch (error) {
    throwApiError(error, "Không thể tải danh sách thanh toán tại quầy");
  }
}

export async function lookupCashPaymentApi(payload: LookupCashPaymentPayload) {
  try {
    const response = await adminApi.post<ApiResponse<AdminCashPaymentItem>>(
      "/admin/cash-payments/lookup",
      payload,
    );

    return response.data.data;
  } catch (error) {
    throwApiError(error, "Không thể tra cứu giao dịch");
  }
}

export async function confirmCashPaymentApi(
  payload: ConfirmCashPaymentPayload,
) {
  try {
    const response = await adminApi.post<ApiResponse<ConfirmCashPaymentResponse>>(
      "/admin/cash-payments/confirm",
      payload,
    );

    return response.data.data;
  } catch (error) {
    throwApiError(error, "Không thể xác nhận thu tiền");
  }
}
