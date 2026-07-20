import adminApi from "@/lib/admin/api";

import type { ApiResponse } from "@/types/common/api.type";

import type {
  AdminCheckinLookupResponse,
  ConfirmCheckinPayload,
  ConfirmCheckinResponse,
  LookupCheckinQrPayload,
} from "@/types/admin/checkin/checkin.type";

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

export async function lookupCheckinQrApi(
  payload: LookupCheckinQrPayload,
): Promise<AdminCheckinLookupResponse> {
  try {
    const response = await adminApi.post<
      ApiResponse<AdminCheckinLookupResponse>
    >("/admin/checkins/lookup", payload);

    return response.data.data;
  } catch (error) {
    throwApiError(error, "Không thể kiểm tra mã QR");
  }
}

export async function confirmCheckinApi(
  payload: ConfirmCheckinPayload,
): Promise<ConfirmCheckinResponse> {
  try {
    const response = await adminApi.post<ApiResponse<ConfirmCheckinResponse>>(
      "/admin/checkins/confirm",
      payload,
    );

    return response.data.data;
  } catch (error) {
    throwApiError(error, "Không thể xác nhận check-in");
  }
}
