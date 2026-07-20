import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminVehicleStatus } from "@/services/server/admin/admin-vehicle.service";
import { updateVehicleStatusSchema } from "@/validators/admin/vehicle.validator";

interface Context {
  params: Promise<{
    vehicleId: string;
  }>;
}

function parseVehicleId(value: string): number {
  const vehicleId = Number(value);

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    throw new Error("vehicleId không hợp lệ");
  }

  return vehicleId;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const { vehicleId: rawVehicleId } = await context.params;
    const vehicleId = parseVehicleId(rawVehicleId);

    const body = await req.json();
    const parsed = updateVehicleStatusSchema.parse(body);

    const data = await updateAdminVehicleStatus(vehicleId, parsed.status);

    return successResponse(data, "Cập nhật trạng thái xe thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN VEHICLE STATUS ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật trạng thái xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Trạng thái xe không hợp lệ",
        null,
        400,
      );
    }

    if (message === "Không tìm thấy xe") {
      return errorResponse(message, null, 404);
    }

    return errorResponse(
      message,
      null,
      message === "vehicleId không hợp lệ" ? 400 : 500,
    );
  }
}
