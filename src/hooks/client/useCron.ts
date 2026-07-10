import { useMutation } from "@tanstack/react-query";

import { cleanupSeatHolds } from "@/services/client/cron.service";

export function useSeatHoldCleanup() {
  return useMutation({
    mutationFn: cleanupSeatHolds,
    retry: 1,
  });
}