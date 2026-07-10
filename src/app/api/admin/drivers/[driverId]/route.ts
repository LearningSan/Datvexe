import { NextRequest } from "next/server";

import {
  updateAdminDriver,
  deleteAdminDriver,
  getAdminDriverDetail,
} from "@/services/server/admin/admin-driver.service";
import { updateAdminDriverSchema } from "@/validators/admin/driver.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    driverId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const driverId = Number(params.driverId);

    if (!driverId) {
      return errorResponse("driverId không hợp lệ", null, 400);
    }

    const body = await req.json();
    const parsed = updateAdminDriverSchema.parse(body);

    const data = await updateAdminDriver(driverId, parsed);

    return successResponse(data, "Cập nhật tài xế thành công");
  } catch (error: any) {
    console.error("[UPDATE ADMIN DRIVER ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật tài xế",
      null,
      500,
    );
  }
}
export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const driverId = Number(params.driverId);

    if (!driverId) {
      return errorResponse("driverId không hợp lệ", null, 400);
    }

    const data = await deleteAdminDriver(driverId);

    return successResponse(data, "Xóa tài xế thành công");
  } catch (error: any) {
    console.error("[DELETE ADMIN DRIVER ERROR]", error);

    return errorResponse(error.message || "Không thể xóa tài xế", null, 500);
  }
}
function parseDriverId(value: string) {
  const driverId = Number(value);

  if (!Number.isInteger(driverId) || driverId <= 0) {
    throw new Error("driverId không hợp lệ");
  }

  return driverId;
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const driverId = parseDriverId(params.driverId);

    const data = await getAdminDriverDetail(driverId);

    return successResponse(data);
  } catch (error: any) {
    console.error("[GET ADMIN DRIVER DETAIL ERROR]", error);

    return errorResponse(
      error.message || "Không thể lấy chi tiết tài xế",
      null,
      error.message === "driverId không hợp lệ" ? 400 : 500,
    );
  }
}
