import api from "@/lib/client/api";

import type { ApiResponse } from "@/types/common/api.type";

import type {
  AdjustAdminWalletPayload,
  AdminWalletListParams,
  AdminWalletListResponse,
  UpdateAdminWalletStatusPayload,
} from "@/types/admin/wallets/wallet-management.type";

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

export async function fetchAdminWallets(params: AdminWalletListParams) {
  try {
    const response = await api.get<ApiResponse<AdminWalletListResponse>>(
      "/admin/wallets",
      {
        params,
      },
    );

    return response.data.data;
  } catch (error) {
    throwApiError(error, "Không thể tải danh sách ví");
  }
}

export async function updateAdminWalletStatusApi(
  walletId: number,
  payload: UpdateAdminWalletStatusPayload,
) {
  try {
    const response = await api.patch(
      `/admin/wallets/${walletId}/status`,
      payload,
    );

    return response.data.data;
  } catch (error) {
    throwApiError(error, "Không thể cập nhật trạng thái ví");
  }
}

export async function adjustAdminWalletApi(
  walletId: number,
  payload: AdjustAdminWalletPayload,
) {
  try {
    const response = await api.post(
      `/admin/wallets/${walletId}/adjustment`,
      payload,
    );

    return response.data.data;
  } catch (error) {
    throwApiError(error, "Không thể điều chỉnh số dư");
  }
}
