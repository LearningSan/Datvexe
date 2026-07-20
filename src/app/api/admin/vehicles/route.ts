import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  createAdminVehicle,
  getAdminVehicles,
} from "@/services/server/admin/admin-vehicle.service";

import {
  adminVehicleListQuerySchema,
  createAdminVehicleSchema,
} from "@/validators/admin/vehicle.validator";

interface MysqlError {
  code?: string;
  sqlMessage?: string;
  message?: string;
}

function isMysqlError(error: unknown): error is MysqlError {
  return typeof error === "object" && error !== null;
}

function getMysqlDuplicateMessage(error: MysqlError) {
  const message = String(error.sqlMessage || error.message || "").toLowerCase();

  if (message.includes("vehicle_code")) {
    return "Mã xe đã tồn tại";
  }

  if (message.includes("license_plate")) {
    return "Biển số xe đã tồn tại";
  }

  return "Mã xe hoặc biển số xe đã tồn tại";
}

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const parsed = adminVehicleListQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const data = await getAdminVehicles(parsed);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN VEHICLES LIST ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể lấy danh sách xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu lọc xe không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
     await getAdminAuthUserId(req);

    const body = await req.json();
    const parsed = createAdminVehicleSchema.parse(body);

    const data = await createAdminVehicle(parsed);

    return successResponse(data, "Thêm xe thành công");
  } catch (error: unknown) {
    console.error("[CREATE ADMIN VEHICLE ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể thêm xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
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
