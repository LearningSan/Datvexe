import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  deleteAdminPickupPoint,
  getAdminPickupPointDetail,
  updateAdminPickupPoint,
} from "@/services/server/admin/admin-pickup-point.service";

import {
  pickupPointIdParamsSchema,
  updateAdminPickupPointSchema,
} from "@/validators/admin/pickup-point.validator";

interface Context {
  params: Promise<{
    pickupPointId: string;
  }>;
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

export async function GET(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;

    const parsedParams = pickupPointIdParamsSchema.parse(params);

    const data = await getAdminPickupPointDetail(parsedParams.pickupPointId);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN PICKUP POINT DETAIL ERROR]", error);

    const message = getErrorMessage(
      error,
      "Không thể lấy chi tiết điểm đón trả",
    );

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;
    const body = await req.json();

    const parsedParams = pickupPointIdParamsSchema.parse(params);
    const parsedBody = updateAdminPickupPointSchema.parse(body);

    const data = await updateAdminPickupPoint(
      parsedParams.pickupPointId,
      parsedBody,
    );

    return successResponse(data, "Cập nhật điểm đón trả thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN PICKUP POINT ERROR]", error);

    const message = getErrorMessage(error, "Không thể cập nhật điểm đón trả");

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;

    const parsedParams = pickupPointIdParamsSchema.parse(params);

    const data = await deleteAdminPickupPoint(parsedParams.pickupPointId);

    return successResponse(data, "Đã tạm ngưng điểm đón trả");
  } catch (error: unknown) {
    console.error("[DELETE ADMIN PICKUP POINT ERROR]", error);

    const message = getErrorMessage(error, "Không thể tạm ngưng điểm đón trả");

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}
