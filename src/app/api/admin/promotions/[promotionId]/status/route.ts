import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminPromotionStatus } from "@/services/server/admin/admin-promotion.service";

import { updateAdminPromotionStatusSchema } from "@/validators/admin/promotion.validator";

interface RouteContext {
  params: Promise<{
    promotionId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await getAdminAuthUserId(req);

    const { promotionId } = await context.params;

    const id = Number(promotionId);

    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse("ID khuyến mãi không hợp lệ", null, 400);
    }

    const body = await req.json();

    const parsed = updateAdminPromotionStatusSchema.parse(body);

    const data = await updateAdminPromotionStatus(id, parsed.isActive);

    return successResponse(
      data,
      parsed.isActive
        ? "Kích hoạt khuyến mãi thành công"
        : "Vô hiệu hóa khuyến mãi thành công",
    );
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN PROMOTION STATUS ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật trạng thái khuyến mãi";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Trạng thái khuyến mãi không hợp lệ",
        null,
        400,
      );
    }

    if (message === "Không tìm thấy khuyến mãi") {
      return errorResponse(message, null, 404);
    }

    if (message.includes("hết hạn")) {
      return errorResponse(message, null, 409);
    }

    return errorResponse(message, null, 500);
  }
}
