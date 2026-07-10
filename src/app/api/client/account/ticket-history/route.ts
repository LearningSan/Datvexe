import { NextRequest } from "next/server";
import { getAuthUserId } from "@/lib/server/auth-user";
import { getTicketHistory } from "@/services/server/client/user.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);

    const data = await getTicketHistory(userId);

    return successResponse(data);
  } catch (error: any) {
    console.error("[GET TICKET HISTORY ERROR]", error);

    if (error.message === "UNAUTHORIZED") {
      return errorResponse("Chưa đăng nhập", null, 401);
    }

    return errorResponse("Không thể tải lịch sử vé", null, 500);
  }
}