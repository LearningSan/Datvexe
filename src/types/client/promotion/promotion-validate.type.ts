

export type ValidatePromotionPayload = {
  code: string;
  tripId: number;
  subtotal: number;
};

export type ValidatePromotionResponse = {
  promotionId: number;
  code: string;
  discount: number;
};