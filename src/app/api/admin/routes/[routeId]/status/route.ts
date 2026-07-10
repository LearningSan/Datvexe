import { NextRequest } from "next/server";
import { updateAdminRouteStatus } from "@/services/server/admin/admin-route.service";
import { updateAdminRouteStatusSchema } from "@/validators/admin/route.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    routeId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const routeId = Number(params.routeId);

    if (!routeId) {
      return errorResponse("routeId không hợp lệ", null, 400);
    }

    const body = await req.json();
    const parsed = updateAdminRouteStatusSchema.parse(body);

    const data = await updateAdminRouteStatus(routeId, parsed);

    return successResponse(data, "Cập nhật trạng thái tuyến xe thành công");
  } catch (error: any) {
    console.error("[UPDATE ADMIN ROUTE STATUS ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật trạng thái tuyến xe",
      null,
      500,
    );
  }
}
