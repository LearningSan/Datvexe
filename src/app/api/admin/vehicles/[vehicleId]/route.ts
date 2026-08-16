import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminVehicle } from "@/services/server/admin/admin-vehicle.service";
import { updateAdminVehicleSchema } from "@/validators/admin/vehicle.validator";

interface Context {
  params: Promise<{
    vehicleId: string;
  }>;
}

interface MysqlError {
  code?: string;
  sqlMessage?: string;
  message?: string;
}

function parseVehicleId(value: string): number {
  const vehicleId = Number(value);

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    throw new Error("vehicleId không hợp lệ");
  }

  return vehicleId;
}

function isMysqlError(error: unknown): error is MysqlError {
  return typeof error === "object" && error !== null;
}

function getMysqlDuplicateMessage(error: MysqlError): string {
  const message = String(error.sqlMessage || error.message || "").toLowerCase();

  if (message.includes("vehicle_code")) {
    return "Mã xe đã tồn tại";
  }

  if (message.includes("license_plate")) {
    return "Biển số xe đã tồn tại";
  }

  return "Mã xe hoặc biển số xe đã tồn tại";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  try {
    await getAdminAuthUserId(req);

    const { vehicleId } = await params;

    const id = Number(vehicleId);

    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse("ID xe không hợp lệ", null, 400);
    }

    const body = await req.json();

    const parsed = updateAdminVehicleSchema.parse(body);

    const data = await updateAdminVehicle(id, parsed);

    return successResponse(data, "Cập nhật xe thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN VEHICLE ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể cập nhật xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu xe không hợp lệ",
        null,
        400,
      );
    }

    if (isMysqlError(error) && error.code === "ER_DUP_ENTRY") {
      return errorResponse(getMysqlDuplicateMessage(error), null, 409);
    }

    return errorResponse(message, null, 500);
  }
}
