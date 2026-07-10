import { useMutation, useQuery } from "@tanstack/react-query";

import {
  fetchActivePromotions,
  validatePromotion,
} from "@/services/client/promotion.service";

export function usePromotions() {
  return useQuery({
    queryKey: ["promotions"],
    queryFn: fetchActivePromotions,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useValidatePromotion() {
  return useMutation({
    mutationFn: validatePromotion,
  });
}