import {
  findActivePromotions,
  findPromotionByCode,
} from "@/repositories/client/promotion.repo";

import { Promotion } from "@/types/client/promotion/promotion.type";

export async function getActivePromotions(): Promise<Promotion[]> {
  return await findActivePromotions();
}
export async function validatePromotionService(input: {
  code: string;
  tripId: number;
  subtotal: number;
}) {
  const promo = await findPromotionByCode(input.code);
  if (!promo) {
    throw new Error("Mã giảm giá không tồn tại");
  }

  const now = new Date();

  if (!promo.is_active) {
    throw new Error("Mã giảm giá không hoạt động");
  }

  const start = new Date(promo.start_date);
  const end = new Date(promo.end_date);

  if (now < start || now > end) {
    throw new Error("Mã giảm giá hết hạn");
  }

  if (input.subtotal < promo.min_order_amount) {
    throw new Error("Không đủ điều kiện áp dụng mã");
  }

  let discount = 0;

  if (promo.discount_type === "PERCENT") {
    discount = (input.subtotal * promo.discount_value) / 100;
  } else {
    discount = promo.discount_value;
  }
  return {
    promotionId: promo.promotion_id,
    code: promo.promo_code,
    discount,
  };
}
