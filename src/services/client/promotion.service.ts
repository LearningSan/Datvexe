import api from "@/lib/client/api";

import { ApiResponse } from "@/types/common/api.type";
import { Promotion } from "@/types/client/promotion/promotion.type";
import {
  ValidatePromotionPayload,
  ValidatePromotionResponse,
} from "@/types/client/promotion/promotion-validate.type";

export async function fetchActivePromotions(): Promise<Promotion[]> {
  const response = await api.get<ApiResponse<Promotion[]>>(
    "/client/promotions/active",
  );

  return response.data.data;
}

export async function validatePromotion(payload: ValidatePromotionPayload) {
  const res = await api.post<ApiResponse<ValidatePromotionResponse>>(
    "/client/promotions/validate",
    payload,
  );

  return res.data.data;
}
