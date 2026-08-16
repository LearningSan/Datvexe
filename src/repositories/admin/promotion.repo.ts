import {
  execute,
  query,
} from "@/lib/server/mysql";

import type {
  AdminPromotionListParams,
  CreateAdminPromotionPayload,
  UpdateAdminPromotionPayload,
} from "@/types/admin/promotion/promotion-management.type";

interface PromotionRow {
  promotion_id: number;
  promo_code: string;
  promotion_name: string;
  discount_type: "PERCENT" | "FIXED";
  discount_value: number;
  min_order_amount: number;
  start_date: string;
  end_date: string;
  usage_limit: number | null;
  usage_count: number;
  is_active: number;
  banner_url: string | null;
  banner_public_id: string | null;
  created_at: string;
}

interface CountRow {
  total: number;
}

export async function findAdminPromotions(
  params: AdminPromotionListParams,
) {
  const {
    keyword = "",
    discountType,
    status,
    page = 1,
    limit = 10,
  } = params;

  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: Record<string, unknown> = {
    keyword: `%${keyword.trim()}%`,
    limit,
    offset,
  };

  if (keyword.trim()) {
    conditions.push(`
      (
        p.promo_code LIKE :keyword
        OR p.promotion_name LIKE :keyword
      )
    `);
  }

  if (discountType) {
    conditions.push(`
      p.discount_type = :discountType
    `);

    values.discountType = discountType;
  }

  if (status === "ACTIVE") {
    conditions.push(`
      p.is_active = TRUE
      AND p.start_date <= NOW()
      AND p.end_date > NOW()
    `);
  }

  if (status === "INACTIVE") {
    conditions.push(`
      p.is_active = FALSE
    `);
  }

  if (status === "EXPIRED") {
    conditions.push(`
      p.end_date <= NOW()
    `);
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const rows = await query<PromotionRow>(
    `
      SELECT
        p.promotion_id,
        p.promo_code,
        p.promotion_name,
        p.discount_type,
        p.discount_value,
        p.min_order_amount,
        p.start_date,
        p.end_date,
        p.usage_limit,
        COUNT(bp.booking_promotion_id) AS usage_count,
        p.is_active,
        p.banner_url,
        p.banner_public_id,
        p.created_at
      FROM promotions p
      LEFT JOIN booking_promotions bp
        ON bp.promotion_id = p.promotion_id
      ${whereClause}
      GROUP BY
        p.promotion_id,
        p.promo_code,
        p.promotion_name,
        p.discount_type,
        p.discount_value,
        p.min_order_amount,
        p.start_date,
        p.end_date,
        p.usage_limit,
        p.is_active,
        p.banner_url,
        p.banner_public_id,
        p.created_at
      ORDER BY p.created_at DESC
      LIMIT :limit OFFSET :offset
    `,
    values,
  );

  const countRows = await query<CountRow>(
    `
      SELECT COUNT(*) AS total
      FROM promotions p
      ${whereClause}
    `,
    values,
  );

  return {
    items: rows.map(mapPromotionRow),
    total: Number(countRows[0]?.total ?? 0),
    page,
    limit,
  };
}

export async function findAdminPromotionById(
  promotionId: number,
) {
  const rows = await query<PromotionRow>(
    `
      SELECT
        p.promotion_id,
        p.promo_code,
        p.promotion_name,
        p.discount_type,
        p.discount_value,
        p.min_order_amount,
        p.start_date,
        p.end_date,
        p.usage_limit,
        COUNT(bp.booking_promotion_id) AS usage_count,
        p.is_active,
        p.banner_url,
        p.banner_public_id,
        p.created_at
      FROM promotions p
      LEFT JOIN booking_promotions bp
        ON bp.promotion_id = p.promotion_id
      WHERE p.promotion_id = :promotionId
      GROUP BY
        p.promotion_id,
        p.promo_code,
        p.promotion_name,
        p.discount_type,
        p.discount_value,
        p.min_order_amount,
        p.start_date,
        p.end_date,
        p.usage_limit,
        p.is_active,
        p.banner_url,
        p.banner_public_id,
        p.created_at
      LIMIT 1
    `,
    { promotionId },
  );

  return rows[0]
    ? mapPromotionRow(rows[0])
    : null;
}

export async function createAdminPromotionRepo(
  data: CreateAdminPromotionPayload,
) {
  const result = await execute(
    `
      INSERT INTO promotions (
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
        banner_public_id
      )
      VALUES (
        :promoCode,
        :promotionName,
        :discountType,
        :discountValue,
        :minOrderAmount,
        :startDate,
        :endDate,
        :usageLimit,
        TRUE,
        :bannerUrl,
        :bannerPublicId
      )
    `,
    {
      promoCode: data.promoCode,
      promotionName: data.promotionName,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount,
      startDate: toMysqlDateTime(data.startDate),
      endDate: toMysqlDateTime(data.endDate),
      usageLimit: data.usageLimit ?? null,
      bannerUrl: data.bannerUrl ?? null,
      bannerPublicId: data.bannerPublicId ?? null,
    },
  );

  return findAdminPromotionById(result.insertId);
}

export async function updateAdminPromotionRepo(
  promotionId: number,
  data: UpdateAdminPromotionPayload,
) {
  await execute(
    `
      UPDATE promotions
      SET
        promo_code = :promoCode,
        promotion_name = :promotionName,
        discount_type = :discountType,
        discount_value = :discountValue,
        min_order_amount = :minOrderAmount,
        start_date = :startDate,
        end_date = :endDate,
        usage_limit = :usageLimit,
        banner_url = :bannerUrl,
        banner_public_id = :bannerPublicId
      WHERE promotion_id = :promotionId
    `,
    {
      promotionId,
      promoCode: data.promoCode,
      promotionName: data.promotionName,
      discountType: data.discountType,
      discountValue: data.discountValue,
      minOrderAmount: data.minOrderAmount,
      startDate: toMysqlDateTime(data.startDate),
      endDate: toMysqlDateTime(data.endDate),
      usageLimit: data.usageLimit ?? null,
      bannerUrl: data.bannerUrl ?? null,
      bannerPublicId: data.bannerPublicId ?? null,
    },
  );

  return findAdminPromotionById(promotionId);
}

export async function updateAdminPromotionStatusRepo(
  promotionId: number,
  isActive: boolean,
) {
  await execute(
    `
      UPDATE promotions
      SET is_active = :isActive
      WHERE promotion_id = :promotionId
    `,
    {
      promotionId,
      isActive,
    },
  );

  return findAdminPromotionById(promotionId);
}

export async function deleteAdminPromotionRepo(
  promotionId: number,
) {
  await execute(
    `
      DELETE FROM promotions
      WHERE promotion_id = :promotionId
    `,
    { promotionId },
  );
}

export async function countPromotionUsage(
  promotionId: number,
) {
  const rows = await query<{ total: number }>(
    `
      SELECT COUNT(*) AS total
      FROM booking_promotions
      WHERE promotion_id = :promotionId
    `,
    { promotionId },
  );

  return Number(rows[0]?.total ?? 0);
}

function mapPromotionRow(row: PromotionRow) {
  return {
    promotionId: Number(row.promotion_id),
    promoCode: row.promo_code,
    promotionName: row.promotion_name,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    minOrderAmount: Number(row.min_order_amount),
    startDate: row.start_date,
    endDate: row.end_date,
    usageLimit:
      row.usage_limit === null
        ? null
        : Number(row.usage_limit),
    usageCount: Number(row.usage_count),
    isActive: Boolean(row.is_active),
    bannerUrl: row.banner_url,
    bannerPublicId: row.banner_public_id,
    createdAt: row.created_at,
  };
}

function toMysqlDateTime(value: string) {
  return value.replace("T", " ") + ":00";
}