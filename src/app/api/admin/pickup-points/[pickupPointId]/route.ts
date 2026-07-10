import { NextRequest } from "next/server";

import {
  deleteAdminPickupPoint,
  getAdminPickupPointDetail,
  updateAdminPickupPoint,
} from "@/services/server/admin/admin-pickup-point.service";

import {
  pickupPointIdParamsSchema,
  updateAdminPickupPointSchema,
} from "@/validators/admin/pickup-point.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    pickupPointId: string;
  }>;
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const params = await context.params;

    const parsedParams = pickupPointIdParamsSchema.parse(params);

    const data = await getAdminPickupPointDetail(parsedParams.pickupPointId);

    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN PICKUP POINT DETAIL ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể lấy chi tiết điểm đón trả",
      null,
      500,
    );
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const body = await req.json();

    const parsedParams = pickupPointIdParamsSchema.parse(params);
    const parsedBody = updateAdminPickupPointSchema.parse(body);

    const data = await updateAdminPickupPoint(
      parsedParams.pickupPointId,
      parsedBody,
    );

    return successResponse(data, "Cập nhật điểm đón trả thành công");
  } catch (error: any) {
    console.error("[UPDATE ADMIN PICKUP POINT ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật điểm đón trả",
      null,
      500,
    );
  }
}

export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const params = await context.params;

    const parsedParams = pickupPointIdParamsSchema.parse(params);

    const data = await deleteAdminPickupPoint(parsedParams.pickupPointId);

    return successResponse(data, "Đã tạm ngưng điểm đón trả");
  } catch (error: any) {
    console.error("[DELETE ADMIN PICKUP POINT ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể tạm ngưng điểm đón trả",
      null,
      500,
    );
  }
}
