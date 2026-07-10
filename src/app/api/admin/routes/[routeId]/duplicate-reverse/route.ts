import { duplicateReverseRoute } from "@/services/server/admin/admin-route.service";
import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    routeId: string;
  }>;
}

export async function POST(_req: Request, context: Context) {
  try {
    const params = await context.params;
    const routeId = Number(params.routeId);

    if (!routeId) {
      return errorResponse("routeId không hợp lệ", null, 400);
    }

    const data = await duplicateReverseRoute(routeId);

    return successResponse(data, "Tạo tuyến chiều ngược lại thành công");
  } catch (error: any) {
    console.error("[DUPLICATE REVERSE ROUTE ERROR]", error);

    return errorResponse(
      error.message || "Không thể tạo tuyến chiều ngược lại",
      null,
      500,
    );
  }
}
