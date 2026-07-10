export interface Promotion {
  promotion_id: number;

  promo_code: string;
  promotion_name: string;

  discount_type: "PERCENT" | "FIXED";
  discount_value: number;

  min_order_amount: number;

  start_date: string;
  end_date: string;

  usage_limit: number | null;

  is_active: boolean;

  banner_url: string | null;
  banner_public_id: string | null;

  created_at: string;
}
