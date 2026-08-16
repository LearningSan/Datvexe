import adminApi from "@/lib/admin/api";

import type {
  AdminPromotionListParams,
  AdminPromotionListResponse,
  CreateAdminPromotionPayload,
  UpdateAdminPromotionPayload,
  AdminPromotionDetail,
} from "@/types/admin/promotion/promotion-management.type";

function throwApiError(error: any, fallback: string): never {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

  throw new Error(message);
}

export async function fetchAdminPromotions(
  params: AdminPromotionListParams,
): Promise<AdminPromotionListResponse> {
  try {
    const res = await adminApi.get("/admin/promotions", { params });

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách khuyến mãi");
  }
}

export async function fetchAdminPromotionDetail(
  promotionId: number,
): Promise<AdminPromotionDetail> {
  try {
    const res = await adminApi.get(`/admin/promotions/${promotionId}`);

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải chi tiết khuyến mãi");
  }
}

export async function createAdminPromotionApi(
  payload: CreateAdminPromotionPayload,
) {
  try {
    const res = await adminApi.post("/admin/promotions", payload);

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tạo khuyến mãi");
  }
}

export async function updateAdminPromotionApi(
  promotionId: number,
  payload: UpdateAdminPromotionPayload,
) {
  try {
    const res = await adminApi.patch(
      `/admin/promotions/${promotionId}`,
      payload,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật khuyến mãi");
  }
}

export async function updateAdminPromotionStatusApi(
  promotionId: number,
  isActive: boolean,
) {
  try {
    const res = await adminApi.patch(
      `/admin/promotions/${promotionId}/status`,
      { isActive },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật trạng thái khuyến mãi");
  }
}

export async function deleteAdminPromotionApi(promotionId: number) {
  try {
    const res = await adminApi.delete(`/admin/promotions/${promotionId}`);

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể xóa khuyến mãi");
  }
}
