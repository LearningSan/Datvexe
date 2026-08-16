export type PromotionDiscountType = "PERCENT" | "FIXED";

export interface AdminPromotionItem {
  promotionId: number;
  promoCode: string;
  promotionName: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  minOrderAmount: number;
  startDate: string;
  endDate: string;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
  bannerUrl: string | null;
  bannerPublicId: string | null;
  createdAt: string;
}

export interface AdminPromotionListParams {
  keyword?: string;
  discountType?: PromotionDiscountType;
  status?: "ACTIVE" | "INACTIVE" | "EXPIRED";
  page?: number;
  limit?: number;
}

export interface AdminPromotionListResponse {
  items: AdminPromotionItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminPromotionDetail extends AdminPromotionItem {}

export interface CreateAdminPromotionPayload {
  promoCode: string;
  promotionName: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  minOrderAmount: number;
  startDate: string;
  endDate: string;
  usageLimit?: number | null;
  bannerUrl?: string | null;
  bannerPublicId?: string | null;
}

export interface UpdateAdminPromotionPayload {
  promoCode: string;
  promotionName: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  minOrderAmount: number;
  startDate: string;
  endDate: string;
  usageLimit?: number | null;
  bannerUrl?: string | null;
  bannerPublicId?: string | null;
}

export interface UpdateAdminPromotionStatusPayload {
  isActive: boolean;
}
