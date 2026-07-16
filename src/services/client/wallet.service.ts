import axios from "@/lib/client/api";

import type {
  CreateWalletTopupPayload,
  CreateWalletTopupResponse,
  WalletSummaryResponse,
  WalletTopupStatusResponse,
  WalletTransactionListResponse,
} from "@/types/client/wallet/wallet.type";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function fetchMyWallet(): Promise<WalletSummaryResponse> {
  const response =
    await axios.get<ApiResponse<WalletSummaryResponse>>("/client/wallet");

  return response.data.data;
}

export async function createWalletTopupApi(
  payload: CreateWalletTopupPayload,
): Promise<CreateWalletTopupResponse> {
  const response = await axios.post<ApiResponse<CreateWalletTopupResponse>>(
    "/client/wallet/topups",
    payload,
  );

  return response.data.data;
}

export async function fetchWalletTopupStatus(
  topupId: number,
): Promise<WalletTopupStatusResponse> {
  const response = await axios.get<ApiResponse<WalletTopupStatusResponse>>(
    `/client/wallet/topups/${topupId}/status`,
  );

  return response.data.data;
}

export async function fetchWalletTransactions(params: {
  page: number;
  limit: number;
}): Promise<WalletTransactionListResponse> {
  const response = await axios.get<ApiResponse<WalletTransactionListResponse>>(
    "/client/wallet/transactions",
    {
      params,
    },
  );

  return response.data.data;
}
