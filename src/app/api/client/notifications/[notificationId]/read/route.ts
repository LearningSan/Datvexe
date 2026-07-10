import { NextRequest } from "next/server";

import { getAuthUserId } from "@/lib/server/auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";
import { readNotification } from "@/services/server/client/notification.service";

interface Context {
  params: Promise<{
    notificationId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const userId = await getAuthUserId(req);

    const params = await context.params;
    const notificationId = Number(params.notificationId);

    if (!Number.isFinite(notificationId) || notificationId <= 0) {
      return errorResponse("notificationId không hợp lệ", null, 400);
    }

    const result = await readNotification(notificationId, userId);

    return successResponse(result);
  } catch (error: any) {
    console.error("[READ NOTIFICATION ERROR]", error);

    if (error.message === "UNAUTHORIZED") {
      return errorResponse("Unauthorized", null, 401);
    }

    return errorResponse(
      error.message || "Failed to read notification",
      null,
      500,
    );
  }
}
