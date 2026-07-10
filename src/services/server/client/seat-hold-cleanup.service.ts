import { withTransaction } from "@/lib/server/mysql";

import {
  findExpiredSeatHoldsGrouped,
  restoreTripSeats,
  deleteExpiredSeatHolds,
} from "@/repositories/client/cron.repo";

export async function cleanupExpiredSeatHolds() {
  return await withTransaction(async (conn) => {
    const expiredGroups = await findExpiredSeatHoldsGrouped(conn);

    if (expiredGroups.length === 0) {
      return {
        success: true,
        cleaned: 0,
      };
    }

    for (const row of expiredGroups) {
      await restoreTripSeats(conn, row.trip_id, Number(row.count));
    }

    await deleteExpiredSeatHolds(conn);

    return {
      success: true,
      cleaned: expiredGroups.reduce((sum, row) => sum + Number(row.count), 0),
    };
  });
}
