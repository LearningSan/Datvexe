import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  updateAdminDriver,
  deleteAdminDriver,
  getAdminDriverDetail,
} from "@/services/server/admin/admin-driver.service";

import { updateAdminDriverSchema } from "@/validators/admin/driver.validator";

interface Context {
  params: Promise<{
    driverId: string;
  }>;
}

function parseDriverId(value: string) {
  const driverId = Number(value);

  if (!Number.isInteger(driverId) || driverId <= 0) {
    throw new Error("driverId không hợp lệ");
  }

  return driverId;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

export async function GET(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;
    const driverId = parseDriverId(params.driverId);

    const data = await getAdminDriverDetail(driverId);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[GET ADMIN DRIVER DETAIL ERROR]", error);

    const message = getErrorMessage(error, "Không thể lấy chi tiết tài xế");

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(
      message,
      null,
      message === "driverId không hợp lệ" ? 400 : 500,
    );
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;
    const driverId = parseDriverId(params.driverId);

    const body = await req.json();
    const parsed = updateAdminDriverSchema.parse(body);

    const data = await updateAdminDriver(driverId, parsed);

    return successResponse(data, "Cập nhật tài xế thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN DRIVER ERROR]", error);

    const message = getErrorMessage(error, "Không thể cập nhật tài xế");

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(
      message,
      null,
      message === "driverId không hợp lệ" ? 400 : 500,
    );
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;
    const driverId = parseDriverId(params.driverId);

    const data = await deleteAdminDriver(driverId);

    return successResponse(data, "Xóa tài xế thành công");
  } catch (error: unknown) {
    console.error("[DELETE ADMIN DRIVER ERROR]", error);

    const message = getErrorMessage(error, "Không thể xóa tài xế");

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(
      message,
      null,
      message === "driverId không hợp lệ" ? 400 : 500,
    );
  }
}
