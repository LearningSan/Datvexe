import { NextRequest } from "next/server";
import {
  createAdminVehicle,
  getAdminVehicles,
} from "@/services/server/admin/admin-vehicle.service";
import {
  adminVehicleListQuerySchema,
  createAdminVehicleSchema,
} from "@/validators/admin/vehicle.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const parsed = adminVehicleListQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const data = await getAdminVehicles(parsed);
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể lấy danh sách xe",
      null,
      500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createAdminVehicleSchema.parse(body);

    const data = await createAdminVehicle(parsed);
    return successResponse(data, "Thêm xe thành công");
  } catch (error: any) {
    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    if (error?.code === "ER_DUP_ENTRY") {
      return errorResponse("Mã xe hoặc biển số xe đã tồn tại", null, 400);
    }

    return errorResponse(error.message || "Không thể thêm xe", null, 500);
  }
}
