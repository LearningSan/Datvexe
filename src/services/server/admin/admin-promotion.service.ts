import {
  findAdminPromotions,
  findAdminPromotionById,
  createAdminPromotionRepo,
  updateAdminPromotionRepo,
  updateAdminPromotionStatusRepo,
  deleteAdminPromotionRepo,
  countPromotionUsage,
} from "@/repositories/admin/promotion.repo";

import type {
  AdminPromotionListParams,
  CreateAdminPromotionPayload,
  UpdateAdminPromotionPayload,
} from "@/types/admin/promotion/promotion-management.type";

export async function getAdminPromotions(params: AdminPromotionListParams) {
  return findAdminPromotions(params);
}

export async function getAdminPromotionDetail(promotionId: number) {
  const promotion = await findAdminPromotionById(promotionId);

  if (!promotion) {
    throw new Error("Không tìm thấy khuyến mãi");
  }

  return promotion;
}

export async function createAdminPromotion(data: CreateAdminPromotionPayload) {
  validatePromotionBusinessRules(data);

  const normalizedData = normalizePromotion(data);

  return createAdminPromotionRepo(normalizedData);
}

export async function updateAdminPromotion(
  promotionId: number,
  data: UpdateAdminPromotionPayload,
) {
  const existing = await findAdminPromotionById(promotionId);

  if (!existing) {
    throw new Error("Không tìm thấy khuyến mãi");
  }

  validatePromotionBusinessRules(data);

  /*
   * Nếu promotion đã được sử dụng,
   * không cho thay đổi những thông tin ảnh hưởng
   * trực tiếp tới giá trị giảm.
   */
  if (existing.usageCount > 0) {
    if (
      existing.discountType !== data.discountType ||
      existing.discountValue !== data.discountValue
    ) {
      throw new Error(
        "Khuyến mãi đã được sử dụng nên không thể thay đổi loại hoặc giá trị giảm",
      );
    }

    if (existing.promoCode !== data.promoCode) {
      throw new Error(
        "Khuyến mãi đã được sử dụng nên không thể thay đổi mã khuyến mãi",
      );
    }
  }

  return updateAdminPromotionRepo(promotionId, normalizePromotion(data));
}

export async function updateAdminPromotionStatus(
  promotionId: number,
  isActive: boolean,
) {
  const existing = await findAdminPromotionById(promotionId);

  if (!existing) {
    throw new Error("Không tìm thấy khuyến mãi");
  }

  if (isActive && existing.endDate <= getCurrentMysqlDateTime()) {
    throw new Error("Không thể kích hoạt khuyến mãi đã hết hạn");
  }

  return updateAdminPromotionStatusRepo(promotionId, isActive);
}

export async function deleteAdminPromotion(promotionId: number) {
  const existing = await findAdminPromotionById(promotionId);

  if (!existing) {
    throw new Error("Không tìm thấy khuyến mãi");
  }

  const usageCount = await countPromotionUsage(promotionId);

  if (usageCount > 0) {
    throw new Error("Không thể xóa khuyến mãi đã được sử dụng");
  }

  await deleteAdminPromotionRepo(promotionId);

  return {
    promotionId,
  };
}

function validatePromotionBusinessRules(
  data: CreateAdminPromotionPayload | UpdateAdminPromotionPayload,
) {
  if (data.startDate >= data.endDate) {
    throw new Error("Ngày hết hạn phải sau ngày bắt đầu");
  }

  if (
    data.discountType === "PERCENT" &&
    (data.discountValue <= 0 || data.discountValue > 100)
  ) {
    throw new Error("Giảm theo phần trăm phải từ 1 đến 100");
  }

  if (data.discountType === "FIXED" && data.discountValue <= 0) {
    throw new Error("Số tiền giảm phải lớn hơn 0");
  }

  if (data.minOrderAmount < 0) {
    throw new Error("Giá trị đơn tối thiểu không được âm");
  }

  if (
    data.usageLimit !== null &&
    data.usageLimit !== undefined &&
    data.usageLimit <= 0
  ) {
    throw new Error("Giới hạn sử dụng phải lớn hơn 0");
  }
}

function normalizePromotion<
  T extends CreateAdminPromotionPayload | UpdateAdminPromotionPayload,
>(data: T): T {
  return {
    ...data,
    promoCode: data.promoCode.trim().toUpperCase(),
    promotionName: data.promotionName.trim(),
    usageLimit: data.usageLimit === undefined ? null : data.usageLimit,
  };
}

function getCurrentMysqlDateTime() {
  const now = new Date();

  const vietnamTime = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return vietnamTime.replace("T", " ");
}
