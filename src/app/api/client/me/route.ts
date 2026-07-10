import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/server/response";
import { getCurrentUser } from "@/services/server/client/user.service";
import { verifyAccessToken } from "@/lib/server/jwt";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return successResponse(null);
    }

    const token = authHeader.replace("Bearer ", "");

    const payload = await verifyAccessToken(token);

    const userId = Number(payload.userId);

    if (!userId) {
      return successResponse(null);
    }

    const result = await getCurrentUser(userId);

    return successResponse(result);
  } catch (error: any) {
    console.error("[GET ME ERROR]", error);

    return errorResponse(
      error.message || "Không thể lấy thông tin người dùng",
      null,
      401,
    );
  }
}
