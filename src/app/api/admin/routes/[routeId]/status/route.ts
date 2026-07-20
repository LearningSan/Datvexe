import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminRouteStatus } from "@/services/server/admin/admin-route.service";

import { updateAdminRouteStatusSchema } from "@/validators/admin/route.validator";

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

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;
    const routeId = parseRouteId(params.routeId);

    const body = await req.json();
    const parsed = updateAdminRouteStatusSchema.parse(body);

    const data = await updateAdminRouteStatus(routeId, parsed);

    return successResponse(data, "Cập nhật trạng thái tuyến xe thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN ROUTE STATUS ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật trạng thái tuyến xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(
      message,
      null,
      message === "routeId không hợp lệ" ? 400 : 500,
    );
  }
}
