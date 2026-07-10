import { NextRequest } from "next/server";
import {
  createAdminRoute,
  getAdminRoutes,
} from "@/services/server/admin/admin-route.service";
import {
  adminRouteListQuerySchema,
  createAdminRouteSchema,
} from "@/validators/admin/route.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = adminRouteListQuerySchema.parse(searchParams);

    const data = await getAdminRoutes(parsed);

    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN ROUTES LIST ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Dữ liệu lọc tuyến xe không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Không thể lấy danh sách tuyến xe",
      null,
      500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createAdminRouteSchema.parse(body);

    const data = await createAdminRoute(parsed);

    return successResponse(data, "Tạo tuyến xe thành công");
  } catch (error: any) {
    console.error("[CREATE ADMIN ROUTE ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.issues?.[0]?.message ||
          error.errors?.[0]?.message ||
          "Dữ liệu tuyến xe không hợp lệ",
        null,
        400,
      );
    }

    if (
      error.code === "ER_DUP_ENTRY" ||
      error.message?.includes("Duplicate entry") ||
      error.message === "Tuyến xe với điểm đi và điểm đến này đã tồn tại"
    ) {
      return errorResponse(
        "Tuyến xe với điểm đi và điểm đến này đã tồn tại",
        null,
        409,
      );
    }

    return errorResponse("Không thể tạo tuyến xe", null, 500);
  }
}
