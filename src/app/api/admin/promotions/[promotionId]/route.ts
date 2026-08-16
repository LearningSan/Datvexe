import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { successResponse, errorResponse } from "@/lib/server/response";

import {
  deleteAdminPromotion,
  getAdminPromotionDetail,
  updateAdminPromotion,
} from "@/services/server/admin/admin-promotion.service";

import { updateAdminPromotionSchema } from "@/validators/admin/promotion.validator";

interface RouteContext {
  params: Promise<{
    promotionId: string;
  }>;
}

function parsePromotionId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("ID khuyến mãi không hợp lệ");
  }

  return id;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await getAdminAuthUserId(req);

    const { promotionId } = await context.params;

    const id = parsePromotionId(promotionId);

    const data = await getAdminPromotionDetail(id);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[GET ADMIN PROMOTION DETAIL ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tải khuyến mãi";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (message === "Không tìm thấy khuyến mãi") {
      return errorResponse(message, null, 404);
    }

    return errorResponse(message, null, 500);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await getAdminAuthUserId(req);

    const { promotionId } = await context.params;

    const id = parsePromotionId(promotionId);

    const body = await req.json();

    const parsed = updateAdminPromotionSchema.parse(body);

    const data = await updateAdminPromotion(id, parsed);

    return successResponse(data, "Cập nhật khuyến mãi thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN PROMOTION ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể cập nhật khuyến mãi";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu khuyến mãi không hợp lệ",
        null,
        400,
      );
    }

    if (message === "Không tìm thấy khuyến mãi") {
      return errorResponse(message, null, 404);
    }

    if (message.includes("đã được sử dụng")) {
      return errorResponse(message, null, 409);
    }

    if ((error as any)?.code === "ER_DUP_ENTRY") {
      return errorResponse(
        "Mã khuyến mãi đã tồn tại trong hệ thống",
        null,
        409,
      );
    }

    return errorResponse(message, null, 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await getAdminAuthUserId(req);

    const { promotionId } = await context.params;

    const id = parsePromotionId(promotionId);

    const data = await deleteAdminPromotion(id);

    return successResponse(data, "Xóa khuyến mãi thành công");
  } catch (error: unknown) {
    console.error("[DELETE ADMIN PROMOTION ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể xóa khuyến mãi";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (message === "Không tìm thấy khuyến mãi") {
      return errorResponse(message, null, 404);
    }

    if (message.includes("đã được sử dụng")) {
      return errorResponse(message, null, 409);
    }

    return errorResponse(message, null, 500);
  }
}
