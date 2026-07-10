import { NextRequest } from "next/server";

import { getAuthUserId } from "@/lib/server/auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";
import { readAllNotifications } from "@/services/server/client/notification.service";

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);

    const result = await readAllNotifications(userId);

    return successResponse(result);
  } catch (error: any) {
    console.error("[READ ALL NOTIFICATIONS ERROR]", error);

    if (error.message === "UNAUTHORIZED") {
      return errorResponse("Unauthorized", null, 401);
    }

    return errorResponse(
      error.message || "Failed to read all notifications",
      null,
      500,
    );
  }
}