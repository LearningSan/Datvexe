import api from "@/lib/client/api";

import { ApiResponse } from "@/types/common/api.type";

export type SeatHoldCleanupResponse = {
  success: boolean;
  cleaned: number;
};

export async function cleanupSeatHolds() {
  const res = await api.get<ApiResponse<SeatHoldCleanupResponse>>(
    "/client/cron/seat-holds",
    {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`,
      },
    },
  );

  return res.data.data;
}
