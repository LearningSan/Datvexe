import { NextRequest } from "next/server";

import { getAuthUserId } from "@/lib/server/auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";
import { getUserNotifications } from "@/services/server/client/notification.service";

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);

    const data = await getUserNotifications(userId);

    return successResponse(data);
  } catch (error: any) {
    console.error("[GET NOTIFICATIONS ERROR]", error);

    if (error.message === "UNAUTHORIZED") {
      return errorResponse("Unauthorized", null, 401);
    }

    return errorResponse(
      error.message || "Failed to get notifications",
      null,
      500,
    );
  }
}
