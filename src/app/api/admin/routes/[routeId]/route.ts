import { NextRequest } from "next/server";
import { updateAdminRoute } from "@/services/server/admin/admin-route.service";
import { updateAdminRouteSchema } from "@/validators/admin/route.validator";
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
    const parsed = updateAdminRouteSchema.parse(body);

    const data = await updateAdminRoute(routeId, parsed, null);

    return successResponse(data, "Cập nhật tuyến xe thành công");
  } catch (error: any) {
    console.error("[UPDATE ADMIN ROUTE ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.issues?.[0]?.message ||
          error.errors?.[0]?.message ||
          "Dữ liệu tuyến xe không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Không thể cập nhật tuyến xe",
      null,
      500,
    );
  }
}
