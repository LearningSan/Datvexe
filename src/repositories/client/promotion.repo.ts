import { query } from "@/lib/server/mysql";

import { Promotion } from "@/types/client/promotion/promotion.type";

export async function findActivePromotions(): Promise<Promotion[]> {
  const sql = `
  SELECT
    promotion_id,
    promo_code,
    promotion_name,
    discount_type,
    discount_value,
    min_order_amount,
    start_date,
    end_date,
    usage_limit,
    is_active,
    banner_url,
    banner_public_id,
    created_at
  FROM promotions
  WHERE is_active = TRUE
    AND NOW() BETWEEN start_date AND end_date
  ORDER BY discount_value DESC
`;

  return await query<Promotion>(sql);
}
export async function findPromotionByCode(
  code: string,
): Promise<Promotion | null> {
  const sql = `
    SELECT *
    FROM promotions
    WHERE promo_code = ?
      AND is_active = 1
    LIMIT 1
  `;

  const result = await query<Promotion>(sql, [code]);

  return result[0] || null;
}
