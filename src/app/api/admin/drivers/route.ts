import { NextRequest } from "next/server";

import {
  getAdminDrivers,
  createAdminDriver,
} from "@/services/server/admin/admin-driver.service";
import {
  adminDriverListQuerySchema,
  createAdminDriverSchema,
} from "@/validators/admin/driver.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    const parsed = adminDriverListQuerySchema.parse(searchParams);

    const data = await getAdminDrivers(parsed);

    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN DRIVERS LIST ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Dữ liệu lọc tài xế không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Không thể lấy danh sách tài xế",
      null,
      500,
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = createAdminDriverSchema.parse(body);

    const data = await createAdminDriver(parsed);

    return successResponse(data, "Tạo tài xế thành công");
  } catch (error: any) {
    console.error("[CREATE ADMIN DRIVER ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(error.message || "Không thể tạo tài xế", null, 500);
  }
}
