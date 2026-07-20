import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { duplicateReverseRoute } from "@/services/server/admin/admin-route.service";

interface Context {
  params: Promise<{
    routeId: string;
  }>;
}

function parseRouteId(value: string): number {
  const routeId = Number(value);

  if (!Number.isInteger(routeId) || routeId <= 0) {
    throw new Error("routeId không hợp lệ");
  }

  return routeId;
}

export async function POST(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;
    const routeId = parseRouteId(params.routeId);

    const data = await duplicateReverseRoute(routeId);

    return successResponse(data, "Tạo tuyến chiều ngược lại thành công");
  } catch (error: unknown) {
    console.error("[DUPLICATE REVERSE ROUTE ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể tạo tuyến chiều ngược lại";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(
      message,
      null,
      message === "routeId không hợp lệ" ? 400 : 500,
    );
  }
}
